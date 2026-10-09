import { compareVersions } from './release-policy.mjs';

export function releaseNotesParameters(tag, sha, tags) {
  const previous = tags
    .filter((candidate) => compareVersions(candidate, tag) < 0)
    .sort(compareVersions)
    .at(-1);
  return {
    tag_name: tag,
    target_commitish: sha,
    ...(previous ? { previous_tag_name: previous } : {}),
  };
}

export function releaseNotesBody(generated, { zipName, type, sha, marker }) {
  if (typeof generated?.body !== 'string' || !generated.body.trim())
    throw new Error('GitHub returned empty or invalid generated release notes.');
  return `${generated.body.trim()}\n\n## Installation\n\nDownload **${zipName}** and upload it in Ghost Admin. GitHub's source archives are not the installable theme. Verify the download with SHA256SUMS.txt.\n\nRelease type: ${type}. Source revision: ${sha}.\n\n${marker}\n`;
}
