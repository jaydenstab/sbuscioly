/* Upcoming GBM cards, flyer archive, poster dialog, and calendar actions. */
'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const EVENTS = (window.SCIOLY_EVENTS || []).slice().sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
const configNode = $('#clubConfig');
const CLUB = configNode ? JSON.parse(configNode.textContent) : {};
const MEETING = CLUB.meeting || {};
const TIME_ZONE = MEETING.timeZone;
let shownPast = [];
let activePosterIndex = -1;
let previousState = '';
let lastFocusedElement = null;

function nowInZone() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function eventEnd(event) {
  return `${event.date}T${event.endTime || MEETING.endTime}`;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatDate(iso, withYear = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {})
  }).format(new Date(`${iso}T12:00:00Z`));
}

function timeLabel(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return `${((hours + 11) % 12) + 1}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''} ${hours >= 12 ? 'PM' : 'AM'}`;
}

function posterThumbnail(path) {
  return path.replace(/^posters\//, 'posters/thumbs/').replace(/\.(?:jpe?g|png)$/i, '.webp');
}

function setSiteLink() {
  const data = window.SCIOLY_SITE || {};
  document.querySelectorAll('[data-site-link="sbengaged"]').forEach(link => {
    if (data.sbengagedUrl) link.href = data.sbengagedUrl;
  });
  document.querySelectorAll('[data-site-link="instagram"]').forEach(link => {
    if (data.instagramUrl) link.href = data.instagramUrl;
    if (data.instagramLabel) link.textContent = `${data.instagramLabel} ↗`;
  });
}

function renderUpcoming(event) {
  const hosts = document.querySelectorAll('.next-event-slot');
  if (!hosts.length) return;
  for (const host of hosts) {
    host.replaceChildren();
    if (!event) {
      const pending = node('div', 'next-pending');
      const copy = node('p', '', 'Check Instagram for schedule changes.');
      const site = window.SCIOLY_SITE || {};
      pending.append(node('h3', '', 'No upcoming activity announced.'), copy);
      if (site.instagramUrl) {
        const link = node('a', 'empty-state-link', `Follow ${site.instagramLabel || 'SBU SciOly'} ↗`);
        link.href = site.instagramUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        pending.append(link);
      }
      host.append(pending);
      continue;
    }

    const copy = node('div', 'next-copy');
    const title = node('h3', '', event.title);
    const date = node('p', 'next-date', `${formatDate(event.date, true)} · ${timeLabel(event.startTime)}`);
    const location = node('p', '', event.location || `${MEETING.building} ${MEETING.room}`);
    const calendarActions = node('div');
    calendarActions.id = 'gbm-calendar-actions';
    copy.append(title, date, location, calendarActions);

    const imageBox = node('div', 'next-poster');
    const image = node('img');
    image.src = event.poster;
    image.alt = `Poster for ${event.title} GBM on ${formatDate(event.date)}`;
    image.loading = 'eager';
    image.decoding = 'async';
    image.setAttribute('fetchpriority', 'high');
    image.addEventListener('error', () => imageBox.replaceChildren(node('p', 'missing-poster', 'Poster image unavailable. Check the filename in data/events.js.')), { once: true });
    imageBox.append(image);
    host.append(copy, imageBox);

    if (window.SBUCalendar?.render) {
      window.SBUCalendar.render({
        ...event,
        timeZone: TIME_ZONE,
        location: event.location || `${MEETING.building} ${MEETING.room}, Stony Brook University, Stony Brook, NY`
      });
    }
  }
}

function useGalleryImage(image, poster) {
  let usingOriginal = false;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.setAttribute('fetchpriority', 'low');
  image.addEventListener('error', () => {
    if (!usingOriginal) {
      usingOriginal = true;
      image.src = poster;
    } else {
      image.replaceWith(node('p', 'missing-poster', 'Poster image unavailable.'));
    }
  });
  image.src = posterThumbnail(poster);
}

function renderGallery(past) {
  const grid = $('#galleryGrid');
  if (!grid) return;
  grid.replaceChildren();
  shownPast = past.slice().sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
  for (const event of shownPast) {
    const card = node('article', 'poster-card');
    const open = node('button', 'poster-click');
    open.type = 'button';
    open.setAttribute('aria-label', `Open full-size poster: ${event.title}, ${formatDate(event.date, true)}`);
    const imageArea = node('div', 'poster-image-area');
    const image = node('img');
    image.alt = `Flyer for ${event.title} GBM`;
    useGalleryImage(image, event.poster);
    imageArea.append(image, node('span', 'poster-cover-tint'), node('span', 'poster-zoom', '↗'));
    open.append(imageArea);
    open.addEventListener('click', () => openPoster(event.id));
    const info = node('div', 'poster-info');
    const left = node('div');
    left.append(node('small', '', formatDate(event.date, true)), node('h3', '', event.title));
    info.append(left, node('span', '', event.type));
    card.append(open, info);
    grid.append(card);
  }
  if (!shownPast.length) grid.append(node('p', 'gallery-empty', 'Past posters will appear here once a meeting has taken place.'));
  const extra = $('#otherEvents');
  const others = window.SCIOLY_OTHER_GBMS || [];
  if (extra) {
    extra.replaceChildren();
    extra.hidden = !others.length;
    if (others.length) {
      extra.append(node('span', 'small-label', 'OTHER MEETINGS'));
      for (const title of others) extra.append(node('span', 'event-chip', title));
    }
  }
}

function refreshByTime() {
  const time = nowInZone();
  const upcoming = EVENTS.filter(event => eventEnd(event) > time);
  const past = EVENTS.filter(event => eventEnd(event) <= time);
  const next = upcoming[0] || null;
  const state = `${next?.id || 'none'}:${past.map(event => event.id).join(',')}`;
  if (state === previousState) return;
  previousState = state;
  renderUpcoming(next);
  renderGallery(past);
}

const dialog = $('#posterDialog');
const dialogImage = $('#dialogImage');

function updateDialog() {
  if (!dialog || !dialogImage || activePosterIndex < 0 || !shownPast[activePosterIndex]) return;
  const event = shownPast[activePosterIndex];
  dialogImage.src = event.poster;
  dialogImage.alt = `Original full-size flyer for ${event.title}`;
  $('#dialogTitle').textContent = event.title;
  $('#dialogDate').textContent = formatDate(event.date, true);
  $('#dialogIndex').textContent = `${activePosterIndex + 1} / ${shownPast.length}`;
  $('#dialogPrev').disabled = shownPast.length < 2;
  $('#dialogNext').disabled = shownPast.length < 2;
}

function openPoster(id) {
  if (!dialog || !dialogImage) return;
  const index = shownPast.findIndex(event => event.id === id);
  if (index < 0) return;
  activePosterIndex = index;
  lastFocusedElement = document.activeElement;
  updateDialog();
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('locked');
}

function shiftPoster(offset) {
  if (!shownPast.length) return;
  activePosterIndex = (activePosterIndex + offset + shownPast.length) % shownPast.length;
  updateDialog();
}

if (dialog) {
  $('#dialogPrev').addEventListener('click', () => shiftPoster(-1));
  $('#dialogNext').addEventListener('click', () => shiftPoster(1));
  $('#dialogClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('locked');
    dialogImage.removeAttribute('src');
    activePosterIndex = -1;
    if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
  });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); shiftPoster(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); shiftPoster(1); }
  });
}

setSiteLink();
refreshByTime();
window.setInterval(refreshByTime, 60000);
