import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  compareVersions,
  parseVersion,
  pendingPullRequests,
  planRelease,
} from './release-policy.mjs';

// Only trusted default-branch code runs with a write token. Every API error fails closed.
const repository = process.env.GH_REPO;
if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('GH_REPO is required.');
const run = (command, args, cwd = process.cwd()) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
const api = (path) => JSON.parse(run('gh', ['api', path]));
const pages = (path) => JSON.parse(run('gh', ['api', '--paginate', '--slurp', path])).flat();
const branch = api(`repos/${repository}`).default_branch;
const history = run('git', ['rev-list', '--first-parent', '--reverse', 'HEAD']).split('\n');
const prs = pendingPullRequests(
  pages(`repos/${repository}/pulls?state=closed&per_page=100`),
  branch,
  history,
);
const releases = pages(`repos/${repository}/releases?per_page=100`);
const tags = run('git', ['tag', '--list'])
  .split('\n')
  .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
tags.forEach(parseVersion);
const tagSha = (tag) => run('git', ['rev-parse', `${tag}^{commit}`]);
const reservations = new Map(
  tags.map((tag) => [
    tag,
    run('git', ['for-each-ref', '--format=%(contents)', `refs/tags/${tag}`]),
  ]),
);
let latest = tags.sort(compareVersions).at(-1);
const publishedPrs = new Set();

for (const pr of prs) {
  const sha = pr.merge_commit_sha;
  const plan = planRelease({
    pr,
    releases,
    tags: new Map(tags.map((tag) => [tag, tagSha(tag)])),
    latest,
    reservations,
    baseline: latest ? undefined : JSON.parse(run('git', ['show', `${sha}:package.json`])).version,
  });
  if (plan.skip) {
    publishedPrs.add(pr.number);
    continue;
  }
  const { type, release, existingTag, tag, marker } = plan;
  // A reserved tag is reused after a failed run; never move a tag or overwrite published assets.
  const version = tag.slice(1);
  const workspace = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'theme-release-'));
  const build = join(workspace, 'source');
  run('git', ['worktree', 'add', '--detach', build, sha]);
  const packagePath = join(build, 'package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  pkg.version = version;
  await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  const lockPath = join(build, 'package-lock.json');
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  lock.version = version;
  lock.packages[''].version = version;
  await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
  for (const args of [['ci'], ['test'], ['run', 'zip']]) console.log(run('npm', args, build));
  const zipName = `${pkg.name}-${version}.zip`;
  const zip = join(build, 'dist', zipName);
  const checksum = createHash('sha256')
    .update(await readFile(zip))
    .digest('hex');
  const checksumPath = join(build, 'dist', 'SHA256SUMS.txt');
  await writeFile(checksumPath, `${checksum}  ${zipName}\n`);
  const notesPath = join(workspace, 'release-notes.md');
  await writeFile(
    notesPath,
    `## ${pr.title}\n\n${pr.html_url}\n\nDownload **${zipName}** and upload it in Ghost Admin. GitHub's source archives are not the installable theme. Verify the download with SHA256SUMS.txt.\n\nRelease type: ${type}. Source revision: ${sha}.\n\n${marker}\n`,
  );
  if (!existingTag) {
    run('git', [
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=41898282+github-actions[bot]@users.noreply.github.com',
      'tag',
      '-a',
      tag,
      sha,
      '-m',
      `${marker}\nrelease-type: ${type}`,
    ]);
    run('git', ['push', 'origin', `refs/tags/${tag}`]);
    tags.push(tag);
    reservations.set(tag, `${marker}\nrelease-type: ${type}`);
  }
  if (!release) {
    // A release belonging to someone else is not adopted or modified.
    run('gh', [
      'release',
      'create',
      tag,
      '--repo',
      repository,
      '--verify-tag',
      '--draft',
      '--title',
      `${pkg.name} ${tag}`,
      '--notes-file',
      notesPath,
    ]);
  }
  run('gh', ['release', 'upload', tag, zip, checksumPath, '--repo', repository, '--clobber']);
  run('gh', [
    'release',
    'edit',
    tag,
    '--repo',
    repository,
    '--draft=false',
    '--latest',
    '--notes-file',
    notesPath,
  ]);
  latest = tag;
  publishedPrs.add(pr.number);
  console.log(`Published ${tag} for PR #${pr.number}`);
}
console.log(`Release queue reconciled: ${publishedPrs.size} merged PRs have published releases.`);
