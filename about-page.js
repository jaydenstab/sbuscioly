/* About page rendering for officer profiles and member-submitted photos. */
'use strict';

function makeNode(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function validLocalAsset(path, prefix) {
  return typeof path === 'string' && path.startsWith(`${prefix}/`) && !path.includes('..') && !path.startsWith('/') && !/[?#]/.test(path);
}

function validPhotoSrcset(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const sources = value.split(',').map(source => source.trim());
  const valid = sources.every(source => {
    const match = /^(photos\/[A-Za-z0-9_./-]+)\s+(\d+)w$/.exec(source);
    return match && validLocalAsset(match[1], 'photos') && Number(match[2]) > 0;
  });
  return valid ? value.trim() : '';
}

function renderOfficers() {
  const officers = window.SCIOLY_OFFICERS || [];
  const grid = document.querySelector('#officerGrid');
  if (!grid) return;
  if (!officers.length) {
    grid.replaceChildren(makeNode('p', 'eboard-empty', 'Officer information will be added when it’s ready.'));
    return;
  }

  grid.replaceChildren();
  for (const officer of officers) {
    const card = makeNode('article', 'officer-card');
    const vacant = /^(vacant|tbd|to be announced)$/i.test(String(officer.name || '').trim());
    const name = vacant ? 'Vacant' : String(officer.name || 'Officer');
    if (validLocalAsset(officer.photo, 'eboard')) {
      const image = document.createElement('img');
      card.className += ' officer-card--with-photo';
      image.src = `./${officer.photo}`;
      image.alt = `${name}, ${officer.role || 'officer'}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      const crop = String(officer.photoPosition || '').trim();
      const match = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(crop);
      if (match && Number(match[1]) <= 100 && Number(match[2]) <= 100) image.style.objectPosition = `${match[1]}% ${match[2]}%`;
      image.addEventListener('error', () => image.remove(), { once: true });
      card.append(image);
    }

    card.append(makeNode('small', 'officer-role', officer.role || 'Officer'), makeNode('strong', '', name));
    if (!vacant && typeof officer.linkedin === 'string') {
      try {
        const url = new URL(officer.linkedin);
        if (url.protocol === 'https:' && (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com'))) {
          const link = makeNode('a', 'officer-social', 'LinkedIn ↗');
          link.href = url.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.setAttribute('aria-label', `Visit ${name}'s LinkedIn profile`);
          card.append(link);
        }
      } catch (_) { /* Ignore malformed optional profile URLs. */ }
    }
    grid.append(card);
  }
}

function renderPhotos() {
  const host = document.querySelector('#photoGallery');
  if (!host) return;
  const section = document.querySelector('#photoSection');
  const photos = Array.isArray(window.SCIOLY_PHOTOS) ? window.SCIOLY_PHOTOS : [];
  const validPhotos = photos.filter(photo => photo && validLocalAsset(photo.src, 'photos') && typeof photo.alt === 'string' && photo.alt.trim());
  if (section) section.hidden = validPhotos.length === 0;
  host.replaceChildren();
  if (!validPhotos.length) {
    host.append(makeNode('p', 'photo-gallery-empty', 'No meeting photos posted yet.'));
    return;
  }

  for (const photo of validPhotos) {
    const figure = document.createElement('figure');
    figure.className = 'photo-item';
    const image = document.createElement('img');
    image.src = `./${photo.src}`;
    image.alt = photo.alt.trim();
    image.loading = 'lazy';
    image.decoding = 'async';
    image.sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px';
    const srcset = validPhotoSrcset(photo.srcset);
    if (srcset) image.srcset = srcset;
    image.addEventListener('error', () => {
      image.replaceWith(makeNode('div', 'photo-unavailable', 'Photo unavailable'));
    }, { once: true });
    figure.append(image);
    if (typeof photo.caption === 'string' && photo.caption.trim()) figure.append(makeNode('figcaption', '', photo.caption.trim()));
    host.append(figure);
  }
}

function renderSiteLinks() {
  const site = window.SCIOLY_SITE || {};
  const sbengaged = document.querySelector('#sbengagedLink');
  const instagram = document.querySelector('#instagramLink');
  if (sbengaged && site.sbengagedUrl) {
    sbengaged.href = site.sbengagedUrl;
    const label = sbengaged.querySelector('strong');
    if (label && site.sbengagedLabel) label.textContent = site.sbengagedLabel;
  }
  if (instagram && site.instagramUrl) instagram.href = site.instagramUrl;
}

renderSiteLinks();
renderOfficers();
renderPhotos();
