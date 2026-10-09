import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareVersions,
  nextVersion,
  parseVersion,
  pendingPullRequests,
  planRelease,
  releaseMarker,
  releaseType,
} from '../scripts/release-policy.mjs';

test('exactly one release label, unrelated labels permitted', () => {
  for (const label of ['major', 'minor', 'patch']) assert.equal(releaseType(['bug', label]), label);
  for (const labels of [
    [],
    ['bug'],
    ['major', 'patch'],
    ['minor', 'major', 'patch'],
    ['path'],
    ['path', 'patch'],
    ['Patch'],
  ])
    assert.throws(() => releaseType(labels));
});
test('semantic bump resets subordinate components including initial zero-major releases', () => {
  assert.equal(nextVersion('v1.2.3', 'major'), '2.0.0');
  assert.equal(nextVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(nextVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(nextVersion('0.1.0', 'patch'), '0.1.1');
  assert.equal(nextVersion('0.1.0', 'minor'), '0.2.0');
  assert.equal(nextVersion('0.1.0', 'major'), '1.0.0');
  assert.throws(() => nextVersion('1.0.0', 'path'));
});
test('numeric versions sort correctly and malformed versions fail', () => {
  assert.deepEqual(['v1.9.0', 'v1.10.0', 'v2.0.0'].sort(compareVersions), [
    'v1.9.0',
    'v1.10.0',
    'v2.0.0',
  ]);
  for (const value of ['1.0', '01.2.3', '1.2.3-beta', '1.2.3;echo nope', '999999999999999999.0.0'])
    assert.throws(() => parseVersion(value));
});
test('queue excludes unmerged and non-default PRs, orders by history rather than event arrival', () => {
  const pr = (number, sha, base = 'main', merged = true) => ({
    number,
    merge_commit_sha: sha,
    base: { ref: base },
    merged_at: merged ? '2026-10-10' : null,
  });
  assert.deepEqual(
    pendingPullRequests(
      [pr(2, 'b'), pr(1, 'a'), pr(3, 'x', 'feature'), pr(4, 'y', 'main', false)],
      'main',
      ['a', 'b'],
    ).map((item) => item.number),
    [1, 2],
  );
  assert.throws(() => pendingPullRequests([pr(1, 'missing')], 'main', ['a']));
});
test('release identity ties retries to both PR and revision', () => {
  assert.equal(releaseMarker(12, 'abc'), '<!-- theme-release pr=12 sha=abc -->');
  assert.notEqual(releaseMarker(12, 'abc'), releaseMarker(13, 'abc'));
  assert.notEqual(releaseMarker(12, 'abc'), releaseMarker(12, 'def'));
});

const pr = { number: 1, merge_commit_sha: 'abc', labels: [{ name: 'minor' }] };
const release = { tag_name: 'v0.2.0', body: releaseMarker(1, 'abc'), draft: true, assets: [] };
const context = { pr, releases: [], tags: new Map(), baseline: '0.1.0' };
test('first release and later release use baseline then highest reserved version', () => {
  assert.equal(planRelease(context).tag, 'v0.2.0');
  assert.equal(
    planRelease({ ...context, latest: 'v1.9.3', tags: new Map([['v1.9.3', 'old']]) }).tag,
    'v1.10.0',
  );
});
test('tag-only failure and incomplete draft recover the same version', () => {
  const reserved = {
    ...context,
    tags: new Map([['v0.2.0', 'abc']]),
    latest: 'v0.2.0',
    reservations: new Map([['v0.2.0', `${releaseMarker(1, 'abc')}\nrelease-type: minor`]]),
  };
  assert.equal(planRelease(reserved).tag, 'v0.2.0');
  assert.equal(planRelease({ ...reserved, releases: [release] }).tag, 'v0.2.0');
  assert.throws(() => planRelease({ ...reserved, latest: 'v0.3.0' }));
  assert.throws(() => planRelease({ ...reserved, pr: { ...pr, labels: [{ name: 'patch' }] } }));
  assert.throws(() => planRelease({ ...reserved, reservations: new Map() }));
});
test('published release is a no-op even if labels subsequently change', () => {
  const published = {
    ...release,
    draft: false,
    assets: [
      { name: 'tech-bytes-playground-0.2.0.zip', size: 100 },
      { name: 'SHA256SUMS.txt', size: 100 },
    ],
  };
  const current = {
    ...context,
    pr: { ...pr, labels: [] },
    tags: new Map([['v0.2.0', 'abc']]),
    releases: [published],
  };
  assert.equal(planRelease(current).skip, true);
  assert.throws(() => planRelease({ ...current, releases: [{ ...published, assets: [] }] }));
});
test('conflicting identity, revision, and duplicate tags fail closed', () => {
  assert.throws(() => planRelease({ ...context, releases: [release] }));
  assert.throws(() =>
    planRelease({ ...context, tags: new Map([['v0.2.0', 'other']]), releases: [release] }),
  );
  assert.throws(() => planRelease({ ...context, releases: [{ ...release, body: 'unrelated' }] }));
  assert.throws(() =>
    planRelease({
      ...context,
      tags: new Map([
        ['v0.2.0', 'abc'],
        ['v0.3.0', 'abc'],
      ]),
    }),
  );
  assert.throws(() => planRelease({ ...context, releases: [release, release] }));
});
