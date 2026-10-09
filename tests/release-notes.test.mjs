import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseNotesParameters, releaseNotesBody } from '../scripts/release-notes.mjs';

test('initial release notes target the exact revision without inventing a previous tag', () => {
  assert.deepEqual(releaseNotesParameters('v0.2.0', 'merge-sha', ['v0.2.0']), {
    tag_name: 'v0.2.0',
    target_commitish: 'merge-sha',
  });
});

test('retries and historical queued releases use the preceding semantic tag, excluding current and future reservations', () => {
  assert.equal(
    releaseNotesParameters('v0.10.0', 'merge-sha', ['v0.11.0', 'v0.2.0', 'v0.10.0', 'v0.9.0'])
      .previous_tag_name,
    'v0.9.0',
  );
});

test('generated changelog is preserved with installation instructions and recovery identity; malformed API responses fail closed', () => {
  const metadata = {
    zipName: 'theme-1.0.0.zip',
    type: 'major',
    sha: 'merge-sha',
    marker: '<!-- theme-release:1:merge-sha -->',
  };
  const generated = {
    body: '## What’s Changed\n* A change by @author in #1\n\n**Full Changelog**: comparison-url',
  };
  const notes = releaseNotesBody(generated, metadata);
  assert.ok(notes.startsWith(generated.body));
  assert.ok(notes.includes(metadata.zipName));
  assert.ok(notes.endsWith(metadata.marker + '\n'));
  for (const response of [null, {}, { body: '' }, { body: '  ' }, { body: 123 }])
    assert.throws(() => releaseNotesBody(response, metadata), /invalid generated release notes/);
});
