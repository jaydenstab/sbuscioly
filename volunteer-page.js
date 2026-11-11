/* Render confirmed volunteer updates. Completion is an editorially verified state. */
'use strict';

const host = document.querySelector('#volunteerTimeline');
const configNode = document.querySelector('#clubConfig');
const config = configNode ? JSON.parse(configNode.textContent) : {};
const timeZone = config.meeting?.timeZone;

function makeNode(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function eventOrder(event, today) {
  const status = window.SBUVolunteerStatus.statusFor(event, today);
  if (!window.SBUVolunteerStatus.validISODate(event.date)) return 2;
  if (status === 'Canceled' || status === 'Completed' || window.SBUVolunteerStatus.isPastDate(event.date, today)) return 1;
  return 0;
}

function sortEvents(events, today) {
  return events.slice().sort((left, right) => {
    const leftOrder = eventOrder(left, today);
    const rightOrder = eventOrder(right, today);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftOrder === 2) return 0;
    const byDate = left.date.localeCompare(right.date);
    return leftOrder === 0 ? byDate : -byDate;
  });
}

function displayDate(value) {
  if (!window.SBUVolunteerStatus?.validISODate(value)) return 'Date to be announced';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(`${value}T12:00:00Z`));
}

function renderVolunteering() {
  if (!host) return;
  host.replaceChildren();
  const today = window.SBUVolunteerStatus.dateInTimeZone(new Date(), timeZone);
  const events = sortEvents(window.SCIOLY_VOLUNTEERING || [], today);
  if (!events.length) {
    host.append(makeNode('p', 'timeline-empty', 'No volunteer dates announced yet.'));
    return;
  }

  for (const event of events) {
    const dateValid = window.SBUVolunteerStatus.validISODate(event.date);
    const status = window.SBUVolunteerStatus.statusFor(event, today);
    const item = makeNode('article', 'timeline-item');
    const top = makeNode('div', 'timeline-top');
    top.append(makeNode('small', '', displayDate(event.date)), makeNode('span', 'timeline-status', status));

    let note = typeof event.note === 'string' ? event.note.trim() : '';
    if (status === 'Recap pending') note = 'Our club was confirmed to volunteer at this tournament. We’ll add a recap after attendance is verified.';
    else if (status === 'Status not verified' && window.SBUVolunteerStatus.isPastDate(event.date, today)) note = 'This date has passed. A participation update has not been posted.';
    else if (status === 'Canceled' && !note) note = 'This volunteer opportunity was canceled.';
    else if (!note) note = status === 'Completed' ? 'Club participation was verified.' : 'Further details will be posted when available.';

    item.append(top, makeNode('h3', '', event.name || 'Volunteer event'), makeNode('p', '', note));
    host.append(item);
  }
}

renderVolunteering();
