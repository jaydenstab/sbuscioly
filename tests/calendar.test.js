const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { FakeElement } = require('./dom-fixture');

const source = fs.readFileSync(path.join(__dirname, '../calendar.js'), 'utf8');

function createCalendar() {
  const target = new FakeElement('div');
  const document = {
    getElementById(id) { return id === 'gbm-calendar-actions' ? target : null; },
    createElement(tag) { return new FakeElement(tag); }
  };
  const window = {};
  vm.runInNewContext(source, { document, window, Intl, Date, URLSearchParams, TextEncoder, Blob, URL, setTimeout });
  return { calendar: window.SBUCalendar, target };
}

test('calendar actions preserve configured time zone and convert meeting time correctly', () => {
  const { calendar, target } = createCalendar();
  calendar.render({
    id: 'nassau-test', title: 'Test GBM', date: '2027-01-12', startTime: '19:00', endTime: '20:00',
    timeZone: 'America/New_York', location: 'Frey Hall 305'
  });
  assert.equal(target.children[0].textContent, 'Save this meeting:');
  assert.match(target.children[1].href, /ctz=America%2FNew_York/);
  assert.match(target.children[1].href, /20270113T000000Z%2F20270113T010000Z/);
  assert.equal(target.children[2].textContent, 'Download .ics');
  assert.match(target.children[3].textContent, /America\/New_York/);
});

test('calendar does not create an event without a time zone', () => {
  const { calendar, target } = createCalendar();
  calendar.render({ id: 'missing-zone', title: 'Test GBM', date: '2027-01-12', startTime: '19:00', endTime: '20:00' });
  assert.equal(target.children.length, 0);
});
