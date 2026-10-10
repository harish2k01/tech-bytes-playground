import test from 'node:test';
import assert from 'node:assert/strict';
import { initTopicsDirectory } from '../assets/js/topics.js';

test('topic pagination preserves existing cards on failure and allows a successful retry', async (t) => {
  const previous = { document: globalThis.document, location: globalThis.location, fetch: globalThis.fetch };
  t.after(() => Object.assign(globalThis, previous));
  let click;
  const button = { dataset: { moreTopics: '2' }, addEventListener: (_, handler) => { click = handler; } };
  const cards = [];
  const status = {};
  const script = { dataset: { api: 'https://example.com/ghost/api/content/', key: 'public-test-key' } };
  const element = () => ({ append() {}, setAttribute() {}, focus() {} });
  globalThis.document = {
    querySelector: (selector) => selector.includes('data-more-topics') ? button : selector.includes('data-topics-grid') ? { append: (...nodes) => cards.push(...nodes) } : selector.includes('data-topics-status') ? status : script,
    createElement: element,
  };
  globalThis.location = { href: 'https://example.com/topics/', origin: 'https://example.com' };
  globalThis.fetch = async () => ({ ok: false });
  initTopicsDirectory();
  await click();
  assert.equal(cards.length, 0);
  assert.equal(button.disabled, false);
  assert.equal(button.dataset.moreTopics, '2');
  assert.match(status.textContent, /try again/);
  globalThis.fetch = async (url) => {
    assert.equal(url.searchParams.get('page'), '2');
    return { ok: true, json: async () => ({ tags: [{ name: 'Storage', url: '/tag/storage/', count: { posts: 1 } }], meta: { pagination: { next: null } } }) };
  };
  await click();
  assert.equal(cards.length, 1);
  assert.equal(cards[0].href, 'https://example.com/tag/storage/');
  assert.equal(button.hidden, true);
});
