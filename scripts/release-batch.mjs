import { nextVersion, releaseLabels, releaseMarker, releaseType } from './release-policy.mjs';

export function batchMarker(batch) {
  return `<!-- theme-release-batch ${JSON.stringify(batch)} -->`;
}

export function readBatch(text = '') {
  const match = /<!-- theme-release-batch (.+) -->/.exec(text);
  return match ? JSON.parse(match[1]) : undefined;
}

export function planBatch({ prs, sha, releases, tags, reservations, latest, baseline }) {
  const published = new Set();
  for (const release of releases.filter((item) => !item.draft)) {
    const batch = readBatch(release.body);
    const members =
      batch?.prs ||
      prs
        .filter((pr) => release.body?.includes(releaseMarker(pr.number, pr.merge_commit_sha)))
        .map((pr) => ({ number: pr.number, sha: pr.merge_commit_sha }));
    if (!members.length) continue;
    if (tags.get(release.tag_name) !== (batch?.sha || members[0].sha))
      throw new Error('Published release revision does not match its tag.');
    for (const name of [`tech-bytes-playground-${release.tag_name.slice(1)}.zip`, 'SHA256SUMS.txt'])
      if (!release.assets.some((asset) => asset.name === name && asset.size > 0))
        throw new Error(`Published release missing ${name}.`);
    for (const member of members) {
      if (!prs.some((pr) => pr.number === member.number && pr.merge_commit_sha === member.sha))
        throw new Error('Published release member is absent from branch history.');
      if (published.has(member.number)) throw new Error('PR claimed by multiple releases.');
      published.add(member.number);
    }
  }
  const incomplete = [...reservations].filter(
    ([tag]) => !releases.some((release) => release.tag_name === tag && !release.draft),
  );
  if (incomplete.length > 1) throw new Error('Multiple incomplete releases require recovery.');
  if (incomplete.length) {
    const [tag, marker] = incomplete[0];
    const batch = readBatch(marker);
    if (!batch) throw new Error('Legacy incomplete release requires manual recovery.');
    if (tag !== latest || tags.get(tag) !== batch.sha)
      throw new Error('Reserved release revision mismatch.');
    if (!batch.prs.length) throw new Error('Reserved release has no PRs.');
    for (const member of batch.prs) {
      const pr = prs.find(
        (item) => item.number === member.number && item.merge_commit_sha === member.sha,
      );
      if (
        !pr ||
        published.has(member.number) ||
        releaseType(pr.labels.map((label) => label.name)) !== member.type
      )
        throw new Error('Reserved release membership or labels changed.');
    }
    const release = releases.find((item) => item.tag_name === tag);
    if (release && batchMarker(readBatch(release.body)) !== batchMarker(batch))
      throw new Error('Draft release identity mismatch.');
    return { tag, batch, marker: batchMarker(batch), release, existingTag: true };
  }
  const pending = prs.filter((pr) => !published.has(pr.number));
  if (!pending.length) return { skip: true };
  const members = pending.map((pr) => ({
    number: pr.number,
    sha: pr.merge_commit_sha,
    type: releaseType(pr.labels.map((label) => label.name)),
  }));
  const type = releaseLabels.find((label) => members.some((member) => member.type === label));
  const batch = { sha, prs: members, type };
  const tag = `v${nextVersion(latest || baseline, type)}`;
  if (releases.some((release) => release.tag_name === tag))
    throw new Error('Release version already exists.');
  return { tag, batch, marker: batchMarker(batch), existingTag: false };
}
