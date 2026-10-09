import test from 'node:test';
import assert from 'node:assert/strict';
import { paletteIndex, uniqueHeadingId } from '../assets/js/utilities.js';
test('heading links cannot collide with existing Ghost headings or layout IDs', () => {
  const ids = new Set(['main', 'installing-sofka', 'installing-sofka-2']);
  assert.equal(uniqueHeadingId('Installing Sofka!', ids), 'installing-sofka-3');
  assert.equal(uniqueHeadingId('main', ids), 'main-2');
  assert.equal(uniqueHeadingId('Installing Sofka!', ids), 'installing-sofka-4');
});
test('non-Latin headings produce usable distinct anchors', () => {
  const ids = new Set();
  assert.equal(uniqueHeadingId('தமிழ் குறிப்புகள்', ids), 'தமிழ்-குறிப்புகள்');
  assert.equal(uniqueHeadingId('!!!', ids), 'section');
  assert.equal(uniqueHeadingId('?', ids), 'section-2');
});
test('article colors remain stable across feeds and pagination', () => {
  for (const slug of ['sofka', 'longhorn', 'grafana', 'தமிழ்']) {
    assert.equal(paletteIndex(slug), paletteIndex(slug));
    assert.ok(paletteIndex(slug) >= 0 && paletteIndex(slug) < 5);
  }
});
