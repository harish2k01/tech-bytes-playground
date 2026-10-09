import {
  createIcons,
  Search,
  SunMoon,
  Menu,
  Shuffle,
  Network,
  Database,
  Activity,
  Boxes,
  House,
  Terminal,
  Mail,
  Server,
  Copy,
  Share2,
  Check,
} from 'lucide';
import { paletteIndex, uniqueHeadingId } from './utilities.js';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
const icons = {
  Search,
  SunMoon,
  Menu,
  Shuffle,
  Network,
  Database,
  Activity,
  Boxes,
  House,
  Terminal,
  Mail,
  Server,
  Copy,
  Share2,
  Check,
};
createIcons({ icons });
// Keep native Ghost navigation, showing shared destinations once in the footer.
const footerDestinations = new Set();
document.querySelectorAll('.bp-footer-links a').forEach((link) => {
  const destination = link.href;
  if (footerDestinations.has(destination)) (link.closest('li') ?? link).remove();
  else footerDestinations.add(destination);
});
document.querySelectorAll('.bp-footer-links nav').forEach((nav) => {
  if (!nav.querySelector('a')) nav.hidden = true;
});
const html = document.documentElement;
const shell = document.querySelector('.bp-shell');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function isDark() {
  const explicit = html.dataset.scheme;
  if (explicit) return explicit === 'dark';
  const defaultScheme = html.dataset.defaultScheme;
  return (
    defaultScheme === 'Dark' ||
    (defaultScheme === 'System' && matchMedia('(prefers-color-scheme:dark)').matches)
  );
}
// Ghost observes this supported script option and updates its native comments UI.
function syncCommentsAppearance() {
  document.querySelectorAll('script[data-ghost-comments]').forEach((script) => {
    script.dataset.colorScheme = isDark() ? 'dark' : 'light';
  });
}
syncCommentsAppearance();
document.addEventListener('tb:appearance', syncCommentsAppearance);
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', syncCommentsAppearance);
document.querySelector('[data-appearance]')?.addEventListener('click', () => {
  const scheme = isDark() ? 'light' : 'dark';
  html.dataset.scheme = scheme;
  try {
    localStorage.setItem('tb-appearance', scheme);
  } catch {}
  document.dispatchEvent(new CustomEvent('tb:appearance', { detail: { scheme } }));
});
function decorateCards(scope = document) {
  scope
    .querySelectorAll('.bp-card[data-palette]')
    .forEach((card) => (card.dataset.color = String(paletteIndex(card.dataset.palette))));
  createIcons({ icons });
}
decorateCards();
const pagination = document.querySelector('.pagination');
const feed = document.querySelector('main > .bp-feed .bp-cards');
const nextLink = pagination?.querySelector('a[rel="next"]');
if (feed && nextLink) {
  const load = document.createElement('button');
  load.type = 'button';
  load.className = 'load-more';
  load.textContent = 'Load more bytes';
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  pagination.prepend(load, status);
  load.addEventListener('click', async () => {
    const target = new URL(nextLink.href);
    if (target.origin !== location.origin) return;
    load.disabled = true;
    load.textContent = 'Loading…';
    try {
      const response = await fetch(target, { credentials: 'same-origin' });
      if (!response.ok) throw Error('Page unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const incoming = [...doc.querySelectorAll('main > .bp-feed .bp-cards > .bp-card')];
      if (!incoming.length) throw Error('No articles found');
      incoming.forEach((card) => feed.append(document.importNode(card, true)));
      decorateCards(feed);
      const next = doc.querySelector('.pagination a[rel="next"]');
      if (next) {
        const url = new URL(next.getAttribute('href'), target);
        if (url.origin !== location.origin) throw Error('Invalid pagination URL');
        nextLink.href = url.href;
        load.textContent = 'Load more bytes';
      } else {
        nextLink.hidden = true;
        load.hidden = true;
      }
      const count = pagination.querySelector(':scope > span:not(.sr-only)');
      if (count) count.textContent = 'More bytes, ready to explore';
      status.textContent = `${incoming.length} more articles loaded`;
      const focusTarget =
        feed.children[feed.children.length - incoming.length].querySelector('h2 a');
      focusTarget?.focus({ preventScroll: true });
    } catch {
      load.textContent = 'Try loading again';
      status.textContent = 'Could not load articles. You can use the Older bytes link instead.';
    } finally {
      load.disabled = false;
    }
  });
}
const surprise = document.querySelector('[data-surprise]');
const pool = [...document.querySelectorAll('.surprise-pool a')]
  .map((a) => a.href)
  .filter((url) => {
    try {
      return new URL(url).origin === location.origin;
    } catch {
      return false;
    }
  });
if (surprise && pool.length) {
  surprise.hidden = false;
  surprise.addEventListener('click', () => {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    location.assign(pool[random[0] % pool.length]);
  });
}
const article = document.querySelector('.article-body');
const focus = document.querySelector('[data-focus]');
if (article && focus) {
  focus.hidden = false;
  focus.addEventListener('click', () => {
    const enabled = shell.classList.toggle('bp-focused');
    focus.setAttribute('aria-pressed', String(enabled));
    focus.textContent = enabled ? 'Exit focus mode' : 'Focus mode';
  });
}
const headings = article ? [...article.querySelectorAll('h2,h3')] : [];
const toc = document.querySelector('[data-toc]');
if (toc && headings.length > 1) {
  const reserved = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
  headings.forEach((heading) => {
    if (!heading.id) heading.id = uniqueHeadingId(heading.textContent, reserved);
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent;
    item.classList.toggle('toc-sub', heading.tagName === 'H3');
    item.append(link);
    toc.append(item);
  });
  document.querySelector('[data-toc-container]').hidden = false;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            toc.querySelectorAll('a').forEach((a) => a.removeAttribute('aria-current'));
            const current = [...toc.querySelectorAll('a')].find(
              (a) => a.hash === `#${encodeURIComponent(entry.target.id)}`,
            );
            current?.setAttribute('aria-current', 'location');
          }
      },
      { rootMargin: '-10% 0px -65% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
  }
}
const progress = document.querySelector('[data-reading-progress]');
if (article && progress) {
  let pending = false;
  const update = () => {
    const top = article.getBoundingClientRect().top + scrollY;
    const total = Math.max(1, article.offsetHeight - innerHeight);
    const amount = Math.min(1, Math.max(0, (scrollY - top) / total));
    progress.style.setProperty('--reading', `${amount * 100}%`);
    pending = false;
  };
  addEventListener(
    'scroll',
    () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  addEventListener('resize', update);
  update();
}
async function copy(text) {
  if (navigator.clipboard && isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  const ok = document.execCommand('copy');
  field.remove();
  if (!ok) throw Error('Copy unavailable');
}
article?.querySelectorAll('pre').forEach((pre) => {
  const code = pre.querySelector('code');
  if (!code) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'bp-code';
  const toolbar = document.createElement('div');
  const label = document.createElement('span');
  const language = [...code.classList].find((c) => c.startsWith('language-'))?.slice(9);
  label.textContent = language ? language.toUpperCase() : 'CODE';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Copy code';
  button.setAttribute('aria-label', 'Copy code block');
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  button.addEventListener('click', async () => {
    try {
      await copy(code.textContent);
      button.textContent = 'Copied!';
      status.textContent = 'Code copied to clipboard';
    } catch {
      button.textContent = 'Select code';
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'Code selected. Use your keyboard to copy.';
    }
    setTimeout(() => (button.textContent = 'Copy code'), 2500);
  });
  toolbar.append(label, button, status);
  pre.before(wrapper);
  wrapper.append(toolbar, pre);
});
const share = document.querySelector('[data-share]');
if (share) {
  share.hidden = false;
  share.addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: location.href });
      else {
        await copy(location.href);
        share.textContent = 'Link copied!';
        setTimeout(() => (share.textContent = 'Share this byte ↗'), 2500);
      }
    } catch (error) {
      if (error.name !== 'AbortError') share.textContent = 'Use your browser to share this link';
    }
  });
}
article?.querySelectorAll('.kg-gallery-image img').forEach((image) => {
  const container = image.closest('.kg-gallery-image');
  const size = () => {
    const width = Number(image.getAttribute('width')) || image.naturalWidth;
    const height = Number(image.getAttribute('height')) || image.naturalHeight;
    if (width && height) container.style.flex = `${width / height} 1 0%`;
  };
  if (image.complete) size();
  else image.addEventListener('load', size, { once: true });
});
const single = document.querySelector('.single');
if (single) {
  single
    .querySelectorAll('.article-feature img,.kg-image-card img,.kg-gallery-card img')
    .forEach((image) => {
      if (image.closest('a')) return;
      const link = document.createElement('a');
      link.href = image.currentSrc || image.src;
      link.dataset.pswpWidth = image.getAttribute('width') || image.naturalWidth || 1200;
      link.dataset.pswpHeight = image.getAttribute('height') || image.naturalHeight || 800;
      link.dataset.zoom = '';
      link.setAttribute('aria-label', `Enlarge image: ${image.alt || 'article image'}`);
      image.before(link);
      link.append(image);
      const measure = () => {
        link.href = image.currentSrc || image.src;
        link.dataset.pswpWidth = image.naturalWidth || link.dataset.pswpWidth;
        link.dataset.pswpHeight = image.naturalHeight || link.dataset.pswpHeight;
      };
      if (image.complete) measure();
      else image.addEventListener('load', measure, { once: true });
    });
  const lightbox = new PhotoSwipeLightbox({
    gallery: single,
    children: 'a[data-zoom]',
    pswpModule: PhotoSwipe,
    showHideAnimationType: reduced() ? 'none' : 'zoom',
    bgOpacity: 0.94,
  });
  lightbox.init();
}
article?.querySelectorAll('table').forEach((table) => {
  if (table.closest('.table-scroll')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'table-scroll';
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', 'Scrollable article table');
  table.before(wrapper);
  wrapper.append(table);
});
if ('IntersectionObserver' in window && !reduced()) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          e.target.classList.add('reveal-in');
          observer.unobserve(e.target);
        }
    },
    { threshold: 0.08 },
  );
  document
    .querySelectorAll('.bp-card,.bp-trail,.bp-newsletter')
    .forEach((e) => observer.observe(e));
}
