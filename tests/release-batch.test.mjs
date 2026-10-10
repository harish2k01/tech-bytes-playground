import test from 'node:test';
import assert from 'node:assert/strict';
import { planBatch } from '../scripts/release-batch.mjs';
import { releaseMarker } from '../scripts/release-policy.mjs';
const pr = (number, type = 'patch') => ({
  number,
  merge_commit_sha: `merge${number}`,
  labels: [{ name: type }],
});
const context = {
  prs: [pr(1), pr(2, 'minor')],
  sha: 'head',
  releases: [],
  tags: new Map(),
  reservations: new Map(),
  latest: 'v0.5.0',
  baseline: '0.1.0',
};
const assets = (tag) => [
  { name: `tech-bytes-playground-${tag.slice(1)}.zip`, size: 100 },
  { name: 'SHA256SUMS.txt', size: 100 },
];
test('pending PRs share strongest semantic bump and exact snapshot', () => {
  const plan = planBatch(context);
  assert.equal(plan.tag, 'v0.6.0');
  assert.equal(plan.batch.sha, 'head');
  assert.deepEqual(
    plan.batch.prs.map((item) => item.number),
    [1, 2],
  );
  assert.equal(planBatch({ ...context, prs: [...context.prs, pr(3, 'major')] }).tag, 'v1.0.0');
  assert.throws(() => planBatch({ ...context, prs: [{ ...pr(1), labels: [] }] }));
});
test('reservation recovers same version and membership after new merges', () => {
  const plan = planBatch(context);
  const retry = {
    ...context,
    sha: 'newhead',
    prs: [...context.prs, pr(3)],
    latest: plan.tag,
    tags: new Map([[plan.tag, 'head']]),
    reservations: new Map([[plan.tag, plan.marker]]),
  };
  assert.deepEqual(planBatch(retry).batch, plan.batch);
  assert.equal(planBatch(retry).tag, plan.tag);
  assert.throws(() => planBatch({ ...retry, prs: [pr(1, 'major'), pr(2, 'minor')] }));
  assert.throws(() => planBatch({ ...retry, tags: new Map([[plan.tag, 'wrong']]) }));
  const draft = { tag_name: plan.tag, draft: true, body: plan.marker };
  assert.equal(planBatch({ ...retry, releases: [draft] }).tag, plan.tag);
  assert.throws(() => planBatch({ ...retry, releases: [{ ...draft, body: 'wrong identity' }] }));
});
test('published batches are immutable and later merges form a new release', () => {
  const plan = planBatch(context);
  const release = { tag_name: plan.tag, body: plan.marker, draft: false, assets: assets(plan.tag) };
  const complete = {
    ...context,
    latest: plan.tag,
    tags: new Map([[plan.tag, 'head']]),
    reservations: new Map([[plan.tag, plan.marker]]),
    releases: [release],
  };
  assert.equal(
    planBatch({ ...complete, prs: context.prs.map((item) => ({ ...item, labels: [] })) }).skip,
    true,
  );
  const next = planBatch({ ...complete, sha: 'newhead', prs: [...context.prs, pr(3)] });
  assert.equal(next.tag, 'v0.6.1');
  assert.deepEqual(
    next.batch.prs.map((item) => item.number),
    [3],
  );
  assert.throws(() => planBatch({ ...complete, releases: [{ ...release, assets: [] }] }));
  assert.throws(() => planBatch({ ...complete, releases: [release, release] }));
});
test('legacy published releases count while unrelated incomplete tags fail closed', () => {
  const legacy = {
    tag_name: 'v0.5.0',
    body: releaseMarker(1, 'merge1'),
    draft: false,
    assets: assets('v0.5.0'),
  };
  const plan = planBatch({ ...context, releases: [legacy], tags: new Map([['v0.5.0', 'merge1']]) });
  assert.deepEqual(
    plan.batch.prs.map((item) => item.number),
    [2],
  );
  assert.throws(() =>
    planBatch({
      ...context,
      tags: new Map([['v0.5.0', 'old']]),
      reservations: new Map([['v0.5.0', 'unrelated']]),
    }),
  );
});
