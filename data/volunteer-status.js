/* Pure date/status helpers shared by the volunteer page and regression tests. */
(function (root) {
  'use strict';

  function validISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
  }

  function dateInTimeZone(instant, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(instant).filter(part => part.type !== 'literal');
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function compareDates(left, right) {
    const [ly, lm, ld] = left.split('-').map(Number);
    const [ry, rm, rd] = right.split('-').map(Number);
    const leftOrdinal = Date.UTC(ly, lm - 1, ld);
    const rightOrdinal = Date.UTC(ry, rm - 1, rd);
    return Math.sign(leftOrdinal - rightOrdinal);
  }

  function isPastDate(value, today) {
    return validISODate(value) && validISODate(today) && compareDates(value, today) < 0;
  }

  function statusFor(event, today) {
    const status = String(event?.status || '').trim().toLowerCase();
    const date = event?.date;
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled' || status === 'canceled') return 'Canceled';
    if (!validISODate(date) || !validISODate(today)) {
      if (status === 'confirmed') return 'Confirmed';
      if (status === 'tentative') return 'Tentative';
      return 'Status not verified';
    }
    const isPast = isPastDate(date, today);
    if (isPast) return status === 'confirmed' ? 'Recap pending' : 'Status not verified';
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'tentative') return 'Tentative';
    return 'Status not verified';
  }

  root.SBUVolunteerStatus = Object.freeze({ validISODate, dateInTimeZone, isPastDate, statusFor });
})(typeof window === 'undefined' ? globalThis : window);
