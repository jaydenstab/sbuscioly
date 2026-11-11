const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { FakeElement, createDocument } = require('./dom-fixture');

const source = fs.readFileSync(path.join(__dirname, '../events-page.js'), 'utf8');
const config = { meeting: { day: 'Tuesday', startTime: '19:00', endTime: '20:00', timeZone: 'America/New_York', building: 'Frey Hall', room: '305' } };

function render(events, now = new Date()) {
  const host = new FakeElement('section');
  const meetingsHost = new FakeElement('section');
  const configNode = new FakeElement('script');
  const activityEvidence = new FakeElement('p');
  configNode.textContent = JSON.stringify(config);
  let calendarEvent = null;
  const context = {
    document: createDocument({
      selectors: { '#clubConfig': configNode, '#homeRecentActivities': activityEvidence },
      lists: { '.next-event-slot': [host, meetingsHost], '[data-site-link="sbengaged"]': [], '[data-site-link="instagram"]': [] }
    }),
    window: {
      SCIOLY_EVENTS: events,
      SCIOLY_SITE: { instagramUrl: 'https://www.instagram.com/stonybrookscioly/', instagramLabel: '@stonybrookscioly' },
      SBUCalendar: { render(event) { calendarEvent = event; } },
      setInterval() {}
    },
    Intl,
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now.getTime(); }
    },
    URL
  };
  vm.runInNewContext(source, context);
  return { host, meetingsHost, calendarEvent, activityEvidence };
}

test('homepage upcoming card renders the next confirmed event and calendar data', () => {
  const result = render([
    { id: 'later', title: 'Later Activity', date: '2999-02-02', startTime: '19:00', endTime: '20:00', poster: 'posters/later.jpg', type: 'Build challenge' },
    { id: 'next', title: 'Next Activity', date: '2999-01-02', startTime: '19:00', endTime: '20:00', poster: 'posters/next.jpg', type: 'Puzzles' }
  ]);
  assert.equal(result.host.children[0].className, 'next-copy');
  assert.equal(result.host.children[0].children[0].textContent, 'Next Activity');
  assert.equal(result.host.children[0].children.length, 4);
  assert.equal(result.host.children[0].children[1].className, 'next-date');
  assert.equal(result.host.children[1].className, 'next-poster');
  assert.equal(result.calendarEvent.id, 'next');
  assert.equal(result.calendarEvent.timeZone, 'America/New_York');
  assert.match(result.calendarEvent.location, /Frey Hall 305/);
  assert.equal(result.meetingsHost.children[0].children[0].textContent, 'Next Activity');
});

test('empty upcoming state says no special activity is announced without implying the meeting is canceled', () => {
  const result = render([]);
  assert.equal(result.host.children[0].className, 'next-pending');
  assert.equal(result.host.children[0].children[0].textContent, 'No specific activity has been announced.');
  assert.equal(result.host.children[0].children.length, 1);
  assert.equal(result.meetingsHost.children[0].children[0].textContent, 'No specific activity has been announced.');
  assert.equal(result.meetingsHost.children[0].children.length, 1);
  assert.equal(result.calendarEvent, null);
});

test('an event remains upcoming until its configured end time in the club time zone', () => {
  const event = { id: 'boundary', title: 'Boundary Activity', date: '2026-11-11', startTime: '19:00', endTime: '20:00', poster: 'posters/event.jpg' };
  const beforeEnd = render([event], new Date('2026-11-12T00:59:00Z'));
  assert.equal(beforeEnd.host.children[0].children[0].textContent, 'Boundary Activity');

  const atEnd = render([event], new Date('2026-11-12T01:00:00Z'));
  assert.equal(atEnd.host.children[0].className, 'next-pending');
  assert.equal(atEnd.host.children[0].children[0].textContent, 'No specific activity has been announced.');
  assert.equal(atEnd.activityEvidence.textContent, 'Recent meetings have included Boundary Activity.');
});

test('homepage activity evidence is derived from past confirmed event data', () => {
  const result = render([
    { id: 'past', title: 'Egg Drop', date: '2000-01-02', startTime: '19:00', endTime: '20:00', poster: 'posters/egg-drop.jpg' },
    { id: 'future', title: 'Future Activity', date: '2999-01-02', startTime: '19:00', endTime: '20:00', poster: 'posters/future.jpg' }
  ]);
  assert.equal(result.activityEvidence.textContent, 'Recent meetings have included Egg Drop.');
});
