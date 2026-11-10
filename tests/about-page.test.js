const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { FakeElement, createDocument } = require('./dom-fixture');

const source = fs.readFileSync(path.join(__dirname, '../about-page.js'), 'utf8');

function render(photos, officers = []) {
  const gallery = new FakeElement('div');
  const photoSection = new FakeElement('section');
  photoSection.hidden = true;
  const officerGrid = new FakeElement('div');
  const document = createDocument({ selectors: { '#photoGallery': gallery, '#photoSection': photoSection, '#officerGrid': officerGrid } });
  vm.runInNewContext(source, { document, window: { SCIOLY_PHOTOS: photos, SCIOLY_OFFICERS: officers }, URL });
  return { gallery, photoSection, officerGrid };
}

test('approved local photos render in data order with accessibility and responsive metadata', () => {
  const result = render([
    { src: 'photos/first.jpg', alt: 'Members testing a design', caption: 'First meeting', srcset: 'photos/first-600.webp 600w, photos/first-1200.webp 1200w' },
    { src: 'photos/second.webp', alt: 'A team activity' }
  ], [{ name: 'TBD', role: 'President' }]);
  assert.equal(result.gallery.children.length, 2);
  assert.equal(result.gallery.children[0].children[0].src, './photos/first.jpg');
  assert.equal(result.gallery.children[0].children[0].alt, 'Members testing a design');
  assert.equal(result.gallery.children[0].children[0].loading, 'lazy');
  assert.equal(result.gallery.children[0].children[0].sizes, '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px');
  assert.equal(result.gallery.children[0].children[0].srcset, 'photos/first-600.webp 600w, photos/first-1200.webp 1200w');
  assert.equal(result.gallery.children[1].children.length, 1);
  assert.equal(result.photoSection.hidden, false);
  assert.equal(result.officerGrid.children[0].children[1].textContent, 'Vacant');
});

test('empty and invalid photo lists show a friendly fallback; failed images do not remain broken', () => {
  const empty = render([{ src: '../private.jpg', alt: 'Not a permitted local photo' }, { src: 'photos/missing.jpg', alt: '' }]);
  assert.equal(empty.gallery.children[0].className, 'photo-gallery-empty');
  assert.equal(empty.gallery.children[0].textContent, 'No meeting photos posted yet.');
  assert.equal(empty.photoSection.hidden, true);

  const missing = render([{ src: 'photos/missing.jpg', alt: 'A club activity' }]);
  assert.equal(missing.photoSection.hidden, false);
  const image = missing.gallery.children[0].children[0];
  image.handlers.get('error')();
  assert.equal(missing.gallery.children[0].children[0].className, 'photo-unavailable');
});

test('officer profiles render cleanly without photographs', () => {
  const result = render([], [{ name: 'Elisabeth Chai', role: 'President', photo: '' }]);
  const card = result.officerGrid.children[0];
  assert.equal(card.children.length, 2);
  assert.equal(card.children[0].textContent, 'President');
  assert.equal(card.children[1].textContent, 'Elisabeth Chai');
});
