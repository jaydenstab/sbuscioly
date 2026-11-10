const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../data/volunteer-status.js'), 'utf8');
const context = { Intl, Date };
context.globalThis = context;
vm.runInNewContext(source, context);
const status = context.SBUVolunteerStatus;

test('verified completion is immediate on the event date', () => {
  assert.equal(status.statusFor({ status: 'completed', date: '2026-11-10' }, '2026-11-10'), 'Completed');
});

test('future confirmed and tentative events retain their status', () => {
  assert.equal(status.statusFor({ status: 'confirmed', date: '2026-11-11' }, '2026-11-10'), 'Confirmed');
  assert.equal(status.statusFor({ status: 'tentative', date: '2026-11-11' }, '2026-11-10'), 'Tentative');
});

test('past confirmed events await an attendance recap', () => {
  assert.equal(status.statusFor({ status: 'confirmed', date: '2026-11-09' }, '2026-11-10'), 'Recap pending');
});

test('canceled and malformed or missing dates are handled safely', () => {
  assert.equal(status.statusFor({ status: 'canceled', date: '2026-11-10' }, '2026-11-10'), 'Canceled');
  assert.equal(status.statusFor({ status: 'confirmed', date: '2026-02-30' }, '2026-11-10'), 'Confirmed');
  assert.equal(status.statusFor({ status: 'confirmed' }, '2026-11-10'), 'Confirmed');
  assert.equal(status.statusFor({ status: 'other', date: '2026-11-09' }, '2026-11-10'), 'Status not verified');
});

test('day boundaries use the configured time zone', () => {
  const beforeMidnightInNewYork = new Date('2026-01-01T04:59:00Z');
  const newYearsDayInNewYork = new Date('2026-01-01T05:00:00Z');
  assert.equal(status.dateInTimeZone(beforeMidnightInNewYork, 'America/New_York'), '2025-12-31');
  assert.equal(status.dateInTimeZone(newYearsDayInNewYork, 'America/New_York'), '2026-01-01');
  assert.equal(status.isPastDate('2025-12-31', '2026-01-01'), true);
  assert.equal(status.isPastDate('2026-01-01', '2026-01-01'), false);
});
