export const releaseLabels = ['major', 'minor', 'patch'];

export function releaseType(labels) {
  if (labels.includes('path')) throw new Error('Use patch, not path.');
  const selected = labels.filter((label) => releaseLabels.includes(label));
  if (selected.length !== 1)
    throw new Error('Exactly one major, minor, or patch label is required.');
  return selected[0];
}

export function parseVersion(value) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) throw new Error(`Invalid stable version: ${value}`);
  const version = match.slice(1).map(Number);
  if (version.some((part) => !Number.isSafeInteger(part)))
    throw new Error('Version exceeds safe integer range.');
  return version;
}

export function compareVersions(a, b) {
  const first = parseVersion(a),
    second = parseVersion(b);
  for (let i = 0; i < 3; i++) if (first[i] !== second[i]) return first[i] - second[i];
  return 0;
}

export function nextVersion(previous, type) {
  const version = parseVersion(previous);
  const index = releaseLabels.indexOf(type);
  if (index < 0) throw new Error(`Unknown release type: ${type}`);
  version[index]++;
  for (let i = index + 1; i < 3; i++) version[i] = 0;
  const result = version.join('.');
  parseVersion(result);
  return result;
}

export function releaseMarker(pr, sha) {
  return `<!-- theme-release pr=${pr} sha=${sha} -->`;
}

export function planRelease({ pr, releases, tags, latest, baseline, reservations = new Map() }) {
  const marker = releaseMarker(pr.number, pr.merge_commit_sha);
  const matches = releases.filter((release) => release.body?.includes(marker));
  if (matches.length > 1) throw new Error(`Multiple releases claim PR #${pr.number}.`);
  const release = matches[0];
  if (release && tags.get(release.tag_name) !== pr.merge_commit_sha)
    throw new Error('Release tag does not match its PR revision.');
  const matchingTags = [...tags]
    .filter(([, sha]) => sha === pr.merge_commit_sha)
    .map(([tag]) => tag);
  if (matchingTags.length > 1) throw new Error('Multiple version tags point to the same PR.');
  if (release && !release.draft) {
    const zipName = `tech-bytes-playground-${release.tag_name.slice(1)}.zip`;
    for (const asset of [zipName, 'SHA256SUMS.txt']) {
      if (!release.assets.some((item) => item.name === asset && item.size > 0))
        throw new Error(
          `Published release missing ${asset}; immutable assets cannot be overwritten.`,
        );
    }
    return { skip: true, tag: release.tag_name };
  }
  const type = releaseType(pr.labels.map((label) => label.name));
  const existingTag = matchingTags[0];
  if (existingTag && reservations.get(existingTag) !== `${marker}\nrelease-type: ${type}`) {
    throw new Error(
      'Reserved tag identity or release label changed; restore the original label before retrying.',
    );
  }
  if (release && existingTag !== release.tag_name) throw new Error('Draft release tag mismatch.');
  if (existingTag && existingTag !== latest)
    throw new Error('Recover the earlier reserved release before later releases.');
  const tag = existingTag || `v${nextVersion(latest || baseline, type)}`;
  if (!release && releases.some((item) => item.tag_name === tag))
    throw new Error(`Release ${tag} exists without the expected PR marker.`);
  return { skip: false, tag, type, release, existingTag, marker };
}

export function pendingPullRequests(prs, branch, history) {
  const positions = new Map(history.map((sha, index) => [sha, index]));
  return prs
    .filter((pr) => pr.merged_at && pr.base.ref === branch)
    .map((pr) => {
      if (!positions.has(pr.merge_commit_sha))
        throw new Error(`PR #${pr.number} is absent from default-branch history.`);
      return pr;
    })
    .sort((a, b) => positions.get(a.merge_commit_sha) - positions.get(b.merge_commit_sha));
}
