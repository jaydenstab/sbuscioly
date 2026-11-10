const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { FakeElement, createDocument } = require('./dom-fixture');

const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

test('mobile navigation opens, closes on selection and Escape, and closes after resizing to desktop', () => {
  const toggle = new FakeElement('button');
  toggle.setAttribute('aria-expanded', 'false');
  const nav = new FakeElement('nav');
  nav.hidden = true;
  const document = createDocument({ selectors: { '#mobileToggle': toggle, '#mobileNav': nav } });
  const window = { innerWidth: 700, handlers: new Map(), addEventListener(name, callback) { this.handlers.set(name, callback); } };
  vm.runInNewContext(source, { document, window });

  toggle.handlers.get('click')();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(nav.hidden, false);

  nav.handlers.get('click')({ target: { closest: () => ({}) } });
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(nav.hidden, true);

  toggle.handlers.get('click')();
  document.handlers.get('keydown')({ key: 'Escape' });
  assert.equal(nav.hidden, true);
  assert.equal(toggle.focused, true);

  toggle.handlers.get('click')();
  window.innerWidth = 1000;
  window.handlers.get('resize')();
  assert.equal(nav.hidden, true);
});
