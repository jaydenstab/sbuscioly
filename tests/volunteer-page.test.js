const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { FakeElement, createDocument } = require('./dom-fixture');

const statusSource = fs.readFileSync(path.join(__dirname, '../data/volunteer-status.js'), 'utf8');
const pageSource = fs.readFileSync(path.join(__dirname, '../volunteer-page.js'), 'utf8');

function render(events) {
  const host = new FakeElement('div');
  const configNode = new FakeElement('script');
  configNode.textContent = JSON.stringify({ meeting: { timeZone: 'America/New_York' } });
  const context = {
    document: createDocument({ selectors: { '#volunteerTimeline': host, '#clubConfig': configNode } }),
    window: { SCIOLY_VOLUNTEERING: events },
    Intl, Date
  };
  context.globalThis = context;
  vm.runInNewContext(statusSource, context);
  vm.runInNewContext(pageSource, context);
  return host;
}

test('volunteer timeline renders verified, upcoming, past, canceled, and invalid-date entries', () => {
  const host = render([
    { id: 'complete', name: 'Completed today', date: '2026-11-10', status: 'completed' },
    { id: 'future', name: 'Future event', date: '2999-01-01', status: 'confirmed' },
    { id: 'past', name: 'Past event', date: '2000-01-01', status: 'confirmed' },
    { id: 'canceled', name: 'Canceled event', date: '2999-02-01', status: 'canceled' },
    { id: 'invalid', name: 'Undated event', date: '2026-02-30', status: 'tentative' }
  ]);
  const byName = Object.fromEntries(host.children.map(card => [card.children[1].textContent, card]));
  assert.equal(byName['Completed today'].children[0].children[1].textContent, 'Completed');
  assert.equal(byName['Future event'].children[0].children[1].textContent, 'Confirmed');
  assert.equal(byName['Past event'].children[0].children[1].textContent, 'Recap pending');
  assert.equal(byName['Canceled event'].children[0].children[1].textContent, 'Canceled');
  assert.equal(byName['Undated event'].children[0].children[0].textContent, 'Date to be announced');
});

test('empty volunteer data displays a useful message', () => {
  const host = render([]);
  assert.equal(host.children[0].textContent, 'No volunteer dates announced yet.');
});
