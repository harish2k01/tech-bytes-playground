import test from 'node:test';
import assert from 'node:assert/strict';
import { hidePortalBadge } from '../assets/js/portal-branding.js';

test('Portal badge styling survives a frame reload without duplicating styles', () => {
  const makeDocument = () => {
    const styles = [];
    return {
      styles,
      head: { appendChild: (style) => styles.push(style) },
      getElementById: (id) => styles.find((style) => style.id === id),
      createElement: () => ({}),
    };
  };
  const frame = { contentDocument: makeDocument() };
  hidePortalBadge(frame);
  hidePortalBadge(frame);
  assert.equal(frame.contentDocument.styles.length, 1);
  assert.match(frame.contentDocument.styles[0].textContent, /\.gh-portal-powered/);
  frame.contentDocument = makeDocument();
  hidePortalBadge(frame);
  assert.equal(frame.contentDocument.styles.length, 1);
});

test('Unavailable or cross-origin Portal documents do not interrupt the theme', () => {
  assert.doesNotThrow(() => hidePortalBadge({ contentDocument: null }));
  assert.doesNotThrow(() => hidePortalBadge({ get contentDocument() { throw new Error('Blocked'); } }));
});
