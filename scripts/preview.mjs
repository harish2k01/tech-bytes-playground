import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import { posts, tags, author, illustration } from './fixtures.mjs';
const h = Handlebars.create();
const root = process.cwd();
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const custom = Object.fromEntries(
  Object.entries(pkg.config.custom).map(([k, v]) => [k, v.default]),
);
const site = {
  title: "Harish's Tech Bytes",
  url: 'http://127.0.0.1:4173',
  locale: 'en',
  members_enabled: true,
  comments_enabled: true,
  navigation: [
    { label: 'Explore', url: '/' },
    { label: 'Topics', url: '/#topics' },
    { label: 'About Harish', url: 'https://harish2k01.xyz' },
  ],
  secondary_navigation: [
    { label: 'About Harish', url: 'https://harish2k01.xyz' },
    { label: 'GitHub', url: 'https://github.com/harish2k01' },
  ],
};
for (const file of await readdir('partials'))
  if (file.endsWith('.hbs'))
    h.registerPartial(file.slice(0, -4), await readFile(`partials/${file}`, 'utf8'));
const safe = (value) => new h.SafeString(value);
h.registerHelper('plural', (count, options) =>
  (count === 0
    ? options.hash.empty
    : count === 1
      ? options.hash.singular
      : options.hash.plural
  ).replace('%', count),
);
h.registerHelper('asset', (p) => `/assets/${p}`);
h.registerHelper('meta_title', function (options) {
  return options.data.root.post?.title ?? site.title;
});
h.registerHelper('body_class', function (options) {
  return `${options.data.root.context}-template`;
});
h.registerHelper('ghost_head', () =>
  safe(
    '<meta name="description" content="Local preview of the Tech Bytes Playground Ghost theme.">',
  ),
);
h.registerHelper('ghost_foot', () =>
  safe(
    `<script>document.addEventListener('click',e=>{const p=e.target.closest('[data-portal],[data-ghost-search]');if(!p)return;e.preventDefault();alert(p.hasAttribute('data-ghost-search')?'Ghost search opens here on a running Ghost site.':'Ghost Portal opens here on a running Ghost site.');});</script>`,
  ),
);
h.registerHelper('navigation', function (options) {
  const configuredSite = options.data.site ?? site;
  const nav =
    options.hash.type === 'secondary'
      ? configuredSite.secondary_navigation
      : configuredSite.navigation;
  return safe(
    `<ul class="nav">${nav.map((x) => `<li><a href="${h.escapeExpression(x.url)}">${h.escapeExpression(x.label)}</a></li>`).join('')}</ul>`,
  );
});
h.registerHelper('foreach', function (items, options) {
  if (!items?.length) return options.inverse(this);
  return items
    .map((item, index) =>
      options.fn(item, {
        data: h.createFrame({
          ...options.data,
          index,
          number: index + 1,
          first: index === 0,
          last: index === items.length - 1,
        }),
        blockParams: [item, index],
      }),
    )
    .join('');
});
h.registerHelper('get', function (resource, options) {
  let items = resource === 'tags' ? tags : (options.data.root.fixturePosts ?? posts);
  if (options.hash.filter?.includes('featured:true')) items = items.filter((p) => p.featured);
  if (options.hash.filter?.includes('id:-'))
    items = items.filter((p) => p.id !== options.data.root.post?.id);
  if (options.hash.order?.includes('asc')) items = [...items].reverse();
  const limit = Number(options.hash.limit) || 100;
  return options.fn({ ...this, [resource]: items.slice(0, limit) });
});
h.registerHelper('is', function (context, options) {
  const yes = String(context)
    .split(',')
    .map((s) => s.trim())
    .includes(options.data.root.context);
  return yes ? options.fn(this) : options.inverse(this);
});
h.registerHelper('match', function (value, expected, options) {
  if (!options) {
    options = expected;
    return value ? options.fn(this) : options.inverse(this);
  }
  return value === expected ? options.fn(this) : options.inverse(this);
});
h.registerHelper('has', function (options) {
  const yes = options.hash.tag
    ? this.tags?.some((t) => t.name === options.hash.tag)
    : options.hash.visibility
      ? this.visibility === options.hash.visibility
      : false;
  return yes ? options.fn(this) : options.inverse(this);
});
h.registerHelper('post', function (options) {
  return options.fn(options.data.root.post);
});
h.registerHelper('tag', function (options) {
  return options.fn(options.data.root.tag);
});
h.registerHelper('author', function (options) {
  return options.fn(author);
});
h.registerHelper('primary_tag', function (options) {
  return this.primary_tag ? options.fn(this.primary_tag) : options.inverse(this);
});
h.registerHelper('url', function () {
  return this.url ?? '/';
});
h.registerHelper('post_class', function () {
  return `post tag-${this.primary_tag?.slug ?? 'notes'}`;
});
h.registerHelper('reading_time', function () {
  return this.reading_time;
});
h.registerHelper('excerpt', function (options) {
  return this.excerpt;
});
h.registerHelper('img_url', (p) => p);
h.registerHelper('content', function () {
  return safe(
    this.access
      ? this.html
      : '<div class="gh-post-upgrade-cta"><h2>This post is for members only</h2><a data-portal="signup" href="#/portal/signup">Subscribe to keep reading</a></div>',
  );
});
h.registerHelper('tags', function () {
  return safe(
    (this.tags ?? []).map((t) => `<a href="${t.url}">${h.escapeExpression(t.name)}</a>`).join(' '),
  );
});
h.registerHelper('date', function (value, options) {
  if (typeof value === 'object') {
    options = value;
    value = this.published_at;
  }
  const date = new Date(value ?? new Date());
  const format = options?.hash?.format;
  if (format === 'YYYY') return date.getUTCFullYear();
  if (format === 'YYYY-MM-DD') return date.toISOString().slice(0, 10);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
});
h.registerHelper('comments', () =>
  safe(
    '<div class="preview-comments"><p>Native Ghost comments are mounted here on the running blog.</p><button data-portal="signin">Sign in to join the conversation ↗</button></div>',
  ),
);
h.registerHelper('comment_count', () => safe('<span class="comment-count">0 comments</span>'));
h.registerHelper('pagination', function (options) {
  return safe(
    h.compile(h.partials.pagination)({ ...options.data.root.pagination }, { data: options.data }),
  );
});
h.registerHelper('page_url', (page) => (page === 1 ? '/' : `/page/${page}/`));
h.registerHelper('prev_post', function (options) {
  const index = posts.findIndex((p) => p.id === options.data.root.post?.id);
  return posts[index + 1] ? options.fn(posts[index + 1]) : options.inverse(this);
});
h.registerHelper('next_post', function (options) {
  const index = posts.findIndex((p) => p.id === options.data.root.post?.id);
  return posts[index - 1] ? options.fn(posts[index - 1]) : options.inverse(this);
});
h.registerHelper('social_url', () => '/');
export async function renderFixture(template, context = {}) {
  const source = (await readFile(`${template}.hbs`, 'utf8')).replace(/{{!< default}}/, '');
  const data = { site, custom, page: { show_title_and_feature_image: true }, ...context };
  const rootContext = {
    posts,
    pagination: { page: 1, pages: 2, next: 2 },
    context: 'home',
    ...context,
  };
  const body = h.compile(source)(rootContext, { data });
  const layout = h.compile(await readFile('default.hbs', 'utf8'));
  return layout({ ...rootContext, body }, { data });
}
const types = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
if (
  process.argv[1] ===
  new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\//g, path.sep)
) {
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:4173');
      if (url.pathname.startsWith('/assets/')) {
        const file = path.resolve(root, '.' + url.pathname);
        if (!file.startsWith(root + path.sep)) {
          res.writeHead(403).end();
          return;
        }
        res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
        res.end(await readFile(file));
        return;
      }
      if (url.pathname === '/fixtures/homelab.svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(illustration);
        return;
      }
      let template = 'index';
      let context = { context: 'home' };
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments[0] === 'tag') {
        template = 'tag';
        const tag = tags.find((t) => t.slug === segments[1]);
        if (!tag) throw Error('Unknown topic');
        context = {
          context: 'tag',
          tag,
          posts: posts.filter((p) => p.tags.includes(tag)),
          pagination: { page: 1, pages: 1 },
        };
      } else if (segments[0] === 'author') {
        template = 'author';
        context = { context: 'author', author, pagination: { page: 1, pages: 1 } };
      } else if (segments[0] === 'page') {
        context = {
          context: 'paged',
          posts: posts.slice(6),
          pagination: { page: 2, pages: 2, prev: 1 },
        };
      } else if (segments[0] === 'about') {
        template = 'page';
        context = {
          context: 'page',
          post: { ...posts[0], title: 'About this preview', comments: false },
        };
      } else if (segments[0] === 'members-only') {
        template = 'post';
        context = {
          context: 'post',
          post: {
            ...posts[0],
            access: false,
            visibility: 'members',
            html: '',
            title: 'A member-only field note',
          },
        };
      } else if (segments[0]?.startsWith('custom-')) {
        template = segments[0];
        context = { context: 'post', post: posts[0] };
      } else if (segments[0]) {
        template = 'post';
        context = { context: 'post', post: posts.find((p) => p.id === segments[0]) };
        if (!context.post) throw Error('Unknown article');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(await renderFixture(template, context));
    } catch (error) {
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'text/plain' }).end(error.message);
    }
  }).listen(4173, '127.0.0.1', () =>
    console.log('Actual template fixture preview: http://127.0.0.1:4173'),
  );
}
