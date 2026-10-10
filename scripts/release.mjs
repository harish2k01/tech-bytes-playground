import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { releaseNotesParameters, releaseNotesBody } from './release-notes.mjs';
import { compareVersions, parseVersion, pendingPullRequests } from './release-policy.mjs';

import { planBatch } from './release-batch.mjs';

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
const botLogin = 'github-actions[bot]';
const botId = JSON.parse(run('gh', ['api', `users/${botLogin}`])).id;
let completed = false;
// Reserve the current branch snapshot before building; a changed head is retried.
for (let attempt = 0; attempt < 5; attempt++) {
  run('git', ['fetch', 'origin', branch, '--tags']);
  const sha = run('git', ['rev-parse', 'FETCH_HEAD']);
  const history = run('git', ['rev-list', '--first-parent', '--reverse', sha]).split('\n');
  const closed = pages(`repos/${repository}/pulls?state=closed&per_page=100`);
  if (api(`repos/${repository}/git/ref/heads/${branch}`).object.sha !== sha) continue;
  const prs = pendingPullRequests(closed, branch, history);
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
  const latest = tags.sort(compareVersions).at(-1);
  const plan = planBatch({
    prs,
    sha,
    releases,
    tags: new Map(tags.map((tag) => [tag, tagSha(tag)])),
    reservations,
    latest,
    baseline: JSON.parse(run('git', ['show', `${sha}:package.json`])).version,
  });
  if (plan.skip) {
    console.log('No pending merged PRs.');
    completed = true;
    break;
  }
  const { release, existingTag, tag, marker, batch } = plan;
  const type = batch.type;
  const sourceSha = batch.sha;
  if (!existingTag) {
    if (api(`repos/${repository}/git/ref/heads/${branch}`).object.sha !== sha) continue;
    run('git', [
      '-c',
      `user.name=${botLogin}`,
      '-c',
      `user.email=${botId}+${botLogin}@users.noreply.github.com`,
      'tag',
      '-a',
      tag,
      sha,
      '-m',
      marker,
    ]);
    try {
      run('git', ['push', 'origin', `refs/tags/${tag}`]);
    } catch (error) {
      if (run('git', ['ls-remote', 'origin', `refs/tags/${tag}`])) throw error;
      run('git', ['tag', '-d', tag]);
      if (api(`repos/${repository}/git/ref/heads/${branch}`).object.sha !== sha) continue;
      throw error;
    }
    tags.push(tag);
  }
  const version = tag.slice(1);
  const workspace = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'theme-release-'));
  const build = join(workspace, 'source');
  run('git', ['worktree', 'add', '--detach', build, sourceSha]);
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
  const noteFields = releaseNotesParameters(tag, sourceSha, tags);
  const generated = JSON.parse(
    run('gh', [
      'api',
      '--method',
      'POST',
      `repos/${repository}/releases/generate-notes`,
      ...Object.entries(noteFields).flatMap(([name, value]) => ['-f', `${name}=${value}`]),
    ]),
  );
  await writeFile(
    notesPath,
    releaseNotesBody(generated, {
      zipName,
      type,
      sha: sourceSha,
      marker:
        marker +
        '\n' +
        batch.prs.map((pr) => `<!-- theme-release pr=${pr.number} sha=${pr.sha} -->`).join('\n'),
    }),
  );
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
      tag,
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
    '--title',
    tag,
    '--draft=false',
    '--latest',
    '--notes-file',
    notesPath,
  ]);
  console.log(`Published ${tag} for PRs ${batch.prs.map((pr) => `#${pr.number}`).join(', ')}`);
  run('git', ['worktree', 'remove', '--force', build]);
  completed = true;
  break;
}
if (!completed) throw new Error('Default branch kept advancing; retry the release workflow.');
