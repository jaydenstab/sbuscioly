class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.handlers = new Map();
    this.style = {};
    this.classList = { add() {}, remove() {} };
    this.hidden = false;
    this.textContent = '';
  }
  append(...children) {
    for (const child of children) child.parentElement = this;
    this.children.push(...children);
  }
  replaceChildren(...children) {
    for (const child of children) child.parentElement = this;
    this.children = children;
  }
  replaceWith(replacement) {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      replacement.parentElement = this.parentElement;
      siblings[index] = replacement;
    }
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] || null; }
  addEventListener(name, callback) { this.handlers.set(name, callback); }
  removeAttribute(name) { delete this.attributes[name]; }
  querySelector() { return null; }
  focus() { this.focused = true; }
}

function createDocument({ selectors = {}, lists = {} } = {}) {
  const document = {
    body: new FakeElement('body'),
    activeElement: new FakeElement('body'),
    querySelector(selector) { return selectors[selector] || null; },
    querySelectorAll(selector) { return lists[selector] || []; },
    createElement(tag) { return new FakeElement(tag); },
    handlers: new Map(),
    addEventListener(name, callback) { this.handlers.set(name, callback); }
  };
  return document;
}

module.exports = { FakeElement, createDocument };
