import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFixture } from '../scripts/preview.mjs';
import { posts, tags } from '../scripts/fixtures.mjs';
test('home uses published posts and dynamic topic discovery', async () => {
  const html = await renderFixture('index', { context: 'home' });
  assert.match(html, /Exploring Sofka/);
  assert.match(html, /href="\/tag\/kubernetes\/"/);
  assert.match(html, /id=['"]topics['"]/);
  assert.doesNotMatch(html, /FOLLOW A READING TRAIL|site-navigation|mobile-menu-toggle/);
  const hero = html.match(/<div class="bp-lab"[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero);
  assert.doesNotMatch(hero, /<a\b|<button\b/);
  assert.match(hero, /Build\./);
  assert.match(html, /class="bp-card-art"[\s\S]*?<img/);
  assert.match(html, /data-ghost-search/);
  const surpriseLinks = [...html.matchAll(/<div class="surprise-pool"[\s\S]*?<\/div>/g)]
    .flatMap(([pool]) => [...pool.matchAll(/href="([^"]+)"/g)].map(([, url]) => url));
  assert.ok(surpriseLinks.length > 1);
  assert.ok(surpriseLinks.every((url) => url !== '/'));
});
test('topic discovery uses the supported tag query and hides tags without published posts', async () => {
  const populated = { ...tags[0], count: { posts: 2 } };
  const empty = { ...tags[1], name: 'Empty topic', count: { posts: 0 } };
  const home = await renderFixture('index', { fixtureTags: [populated, empty] });
  assert.match(home, /id="topics"/);
  assert.doesNotMatch(home, /Empty topic/);
  const noPosts = await renderFixture('index', { fixtureTags: [empty] });
  assert.doesNotMatch(noPosts, /id="topics"/);
});
test('topics directory lists public tags and discovery links only to a published directory page', async () => {
  const directory = await renderFixture('custom-topics', { context: 'page', post: { title: 'All topics' } });
  assert.match(directory, /All topics/);
  for (const tag of tags) assert.ok(directory.includes(tag.name));
  const absent = await renderFixture('index');
  assert.doesNotMatch(absent, /View all topics/);
  const available = await renderFixture('index', { fixturePages: [{ title: 'Topics', url: '/subjects/' }] });
  assert.match(available, /href="\/subjects\/">View all topics/);
});

test('Ghost configuration controls navigation placement, accent, and membership actions', async () => {
  const home = await renderFixture('index', { context: 'home' });
  const header = home.match(/<header class="bp-header"[\s\S]*?<\/header>/)[0];
  assert.doesNotMatch(header, /aria-label="Main navigation"/);
  assert.match(home, /<footer[\s\S]*?aria-label="Main navigation"[\s\S]*?Explore/);
  const configured = await renderFixture('index', {
    context: 'home',
    custom: { navigation_location: 'Header', color_scheme: 'Light' },
    site: {
      title: 'Configured publication',
      url: 'https://example.com',
      locale: 'en',
      accent_color: '#123456',
      members_enabled: false,
      navigation: [{ label: 'Configured link', url: '/configured/' }],
      secondary_navigation: [],
    },
  });
  assert.match(configured, /<header class="bp-header"[\s\S]*?Configured link/);
  assert.match(configured, /--ghost-accent-color:\s*#123456/);
  assert.doesNotMatch(configured, /<a[^>]*data-portal|MORE CURIOSITY IN YOUR INBOX/);
  assert.doesNotMatch(configured.match(/<footer[\s\S]*?<\/footer>/)[0], /Configured link/);
});
test('post retains Ghost content, comments and member access boundary', async () => {
  const allowed = await renderFixture('post', { context: 'post', post: posts[0] });
  assert.match(allowed, /sofka --readonly/);
  assert.match(allowed, /id="discussion"/);
  assert.match(allowed.match(/<header class="bp-article-intro"[\s\S]*?<\/header>/)[0], /data-share/);
  assert.doesNotMatch(allowed.match(/<footer class="article-footer[\s\S]*?<\/footer>/)[0], /article-tags|data-share/);
  const denied = await renderFixture('post', {
    context: 'post',
    post: { ...posts[0], access: false, visibility: 'members' },
  });
  assert.doesNotMatch(denied, /<code class="language-shell">/);
  assert.match(denied, /This post is for members only/);
});

test('discovery retains featured selections and respects publication icons', async () => {
  const featured = await renderFixture('index', { custom: { discovery_layout: 'Featured posts' } });
  assert.match(featured, /id="featured-title"/);
  assert.doesNotMatch(featured, /id="topics"/);
  const hidden = await renderFixture('index', { custom: { discovery_layout: 'Hidden' }, site: { icon: 'https://example.com/icon.png' } });
  assert.doesNotMatch(hidden, /id="topics"|id="featured-title"|branding\/favicon/);
});

test('featured panel disappears without selections and imageless posts use generic artwork', async () => {
  const html = await renderFixture('index', {
    context: 'home',
    custom: { discovery_layout: 'Featured posts' },
    fixturePosts: posts.map((post) => ({ ...post, featured: false })),
    posts: [{ ...posts[0], feature_image: null }],
  });
  assert.doesNotMatch(html, /id=['"]featured-title['"]|WORTH ANOTHER LOOK/);
  assert.match(html, /Field notes/);
  assert.doesNotMatch(html, /class="bp-card-art"[\s\S]*?<img/);
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
  assert.match(tag, /Clusters, orchestration/);
  assert.doesNotMatch(tag, /id=['"]topics['"]|site-navigation/);
  const noDescription = await renderFixture('tag', {
    context: 'tag',
    tag: { ...tags[0], description: '' },
  });
  assert.doesNotMatch(noDescription, /Clusters, orchestration/);
  const page = await renderFixture('index', {
    context: 'paged',
    pagination: { page: 2, pages: 2, prev: 1 },
    posts: posts.slice(6),
  });
  assert.doesNotMatch(page, /<section class="bp-hero"/);
  assert.match(page, /Newer bytes/);
});
