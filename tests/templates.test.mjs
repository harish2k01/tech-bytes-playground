import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFixture } from '../scripts/preview.mjs';
import { posts, tags } from '../scripts/fixtures.mjs';
test('home uses published data and hides private trail tags', async () => {
  const html = await renderFixture('index', { context: 'home' });
  assert.match(html, /Exploring Sofka/);
  assert.match(html, /href="\/tag\/kubernetes\/"/);
  assert.match(html, /id=['"]trail-title['"]/);
  assert.doesNotMatch(html, />#trail</);
  assert.match(html, /data-ghost-search/);
});
test('post retains Ghost content, comments and member access boundary', async () => {
  const allowed = await renderFixture('post', { context: 'post', post: posts[0] });
  assert.match(allowed, /sofka --readonly/);
  assert.match(allowed, /id="discussion"/);
  const denied = await renderFixture('post', {
    context: 'post',
    post: { ...posts[0], access: false, visibility: 'members' },
  });
  assert.doesNotMatch(denied, /<code class="language-shell">/);
  assert.match(denied, /This post is for members only/);
});
test('existing custom image templates keep their intended behavior', async () => {
  const hidden = await renderFixture('custom-no-feature-image', {
    context: 'post',
    post: posts[0],
  });
  assert.doesNotMatch(hidden, /<figure class="article-feature"/);
  const full = await renderFixture('custom-full-feature-image', {
    context: 'post',
    post: posts[0],
  });
  assert.match(full, /image-full/);
});
test('archives and subsequent pages do not repeat the homepage hero', async () => {
  const tag = await renderFixture('tag', {
    context: 'tag',
    tag: tags[0],
    posts: posts.filter((p) => p.primary_tag === tags[0]),
  });
  assert.match(tag, /<h1>\s*Kubernetes/);
  const page = await renderFixture('index', {
    context: 'paged',
    pagination: { page: 2, pages: 2, prev: 1 },
    posts: posts.slice(6),
  });
  assert.doesNotMatch(page, /<section class="bp-hero"/);
  assert.match(page, /Newer bytes/);
});
