/* SBU SciOly — no build system. Built for GitHub Pages.
   Event/volunteering/officer data lives in /data/; edit those files, not this one.
   The motion and card effects are custom, dependency-free adaptations of UI
   patterns seen in 21st.dev galleries (not imported React components).
*/
'use strict';
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const $ = (q, root=document) => root.querySelector(q);
const EVENTS = (window.SCIOLY_EVENTS || []).slice().sort((a,b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
const ZONE = 'America/New_York';
let shownPast = [];
let activePosterIndex = -1;
let previousState = '';
let lastFocusedElement = null;

function nowInNewYork(){
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
    timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function eventEnd(e){return `${e.date}T${e.endTime||'20:00'}`;}
function posterThumbnail(path){
  // Gallery cards use small WebP previews; full-size viewer always uses the original JPG.
  return path.replace(/^posters\//,'posters/thumbs/').replace(/\.(?:jpe?g|png)$/i,'.webp');
}
function useGalleryImage(img, poster){
  let usingOriginal = false;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.setAttribute('fetchpriority','low');
  img.addEventListener('error',()=>{
    if(!usingOriginal){usingOriginal=true;img.src=poster;}
    else img.replaceWith(node('p','missing-poster','Poster image unavailable. Check the file in posters/.'));
  });
  img.src=posterThumbnail(poster);
}
function formatDate(iso,withYear=false){return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',...(withYear?{year:'numeric'}:{})}).format(new Date(`${iso}T12:00:00Z`));}
function timeLabel(time){const [hours,minutes]=time.split(':').map(Number);return `${((hours+11)%12)+1}${minutes?`:${String(minutes).padStart(2,'0')}`:''} ${hours>=12?'PM':'AM'}`;}
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function setLink(){const data=window.SCIOLY_SITE||{};if(data.sbengagedUrl)$('#sbengagedLink').href=data.sbengagedUrl;if(data.sbengagedLabel)$('#sbengagedLabel').textContent=data.sbengagedLabel;}

function renderUpcoming(event){
  const host=$('#nextEvent');host.replaceChildren();
  if(!event){
    const pending=node('div','next-pending');
    const top=node('div','card-topline');top.append(node('span','', 'NEXT GBM'),node('span','','↗'));
    pending.append(top,node('h3','', 'Next activity: to be announced.'),node('p','', 'We’ll post the next flyer as soon as it’s ready.'));
    host.append(pending);return;
  }
  const copy=node('div','next-copy');
  const top=node('div','card-topline');top.append(node('span','', 'UPCOMING GBM'),node('span','','✳'));
  const h=node('h3','',event.title),date=node('p','next-date',`${formatDate(event.date,true)} · ${timeLabel(event.startTime)}`);
  const desc=node('p','', 'Frey Hall 305');
  const badge=node('span','event-tag','NEXT UP');
  const calendarActions = node('div');
  calendarActions.id = 'gbm-calendar-actions';

  copy.append(top,h,date,desc,badge,calendarActions);
  const imageBox=node('div','next-poster');
  const img=node('img');img.src=event.poster;img.alt=`Poster for ${event.title} GBM on ${formatDate(event.date)}`;img.loading='eager';img.decoding='async';img.setAttribute('fetchpriority','high');
  img.addEventListener('error',()=>{imageBox.replaceChildren(node('p','missing-poster','Poster image unavailable. Check the filename in data/events.js.'));});
  imageBox.append(img);
  host.append(copy,imageBox);
  // Add calendar options for the upcoming GBM.
  if (window.SBUCalendar?.render) {
    window.SBUCalendar.render({
      ...event,
      location: event.location || 'Frey Hall 305, Stony Brook University, Stony Brook, NY'
    });
  }

}
function renderGallery(past){
  const grid=$('#galleryGrid');grid.replaceChildren();shownPast=past.slice().sort((a,b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
  for (const ev of shownPast){
    const card=node('article','poster-card');
    const open=node('button','poster-click');open.type='button';open.setAttribute('aria-label',`Open full-size poster: ${ev.title}, ${formatDate(ev.date,true)}`);
    const imageArea=node('div','poster-image-area'),img=node('img');img.alt=`Flyer for ${ev.title} GBM`;
    useGalleryImage(img,ev.poster);
    imageArea.append(img,node('span','poster-cover-tint'),node('span','poster-zoom','↗'));open.append(imageArea);
    open.addEventListener('click',()=>openPoster(ev.id));
    const info=node('div','poster-info'),left=node('div');left.append(node('small','',formatDate(ev.date,true)),node('h3','',ev.title));
    info.append(left,node('span','',ev.type));card.append(open,info);grid.append(card);
  }
  if (!shownPast.length){grid.append(node('p','gallery-empty', 'Past posters will appear here once a meeting has taken place.'));}
  const extra=$('#otherEvents'),others=window.SCIOLY_OTHER_GBMS||[];extra.replaceChildren();extra.hidden=!others.length;
  if(others.length){extra.append(node('span','small-label','OTHER GBMS'));for(const title of others)extra.append(node('span','event-chip',title));}
}
function renderVolunteering(){
  const host=$('#volunteerTimeline');host.replaceChildren();
  const events=(window.SCIOLY_VOLUNTEERING||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
  if(!events.length){host.append(node('p','timeline-empty','No volunteer dates announced yet.'));return;}
  const today=nowInNewYork().slice(0,10);
  for(const ev of events){
    const pastDate=ev.date<today;
    const item=node('article','timeline-item'),top=node('div','timeline-top');
    let status='', note=ev.note||'';
    if(ev.status==='completed'){
      status=pastDate?'Completed':'Completion to be verified';
    } else if(pastDate){
      status=ev.status==='confirmed'?'Recap pending':'Status not verified';
      // A scheduled visit is not evidence the club actually attended.
      note=ev.status==='confirmed'
        ? 'Our club was confirmed to volunteer at this tournament. We’ll add a recap after attendance is verified.'
        : 'This date has passed. A participation update has not been posted.';
    } else if(ev.status==='confirmed'){
      status='Confirmed';
    } else {
      status='Tentative';
    }
    top.append(node('small','',formatDate(ev.date,true)),node('span','timeline-status',status));
    item.append(top,node('h3','',ev.name),node('p','',note));host.append(item);
  }
}

function renderOfficers(){
  const officers=window.SCIOLY_OFFICERS||[];if(!officers.length)return;
  const grid=$('#officerGrid');grid.replaceChildren();$('.coming-pill').hidden=true;
  for(const officer of officers){
    const card=node('article','officer-card');
    if(officer.photo){
      const img=node('img');img.src=officer.photo;img.alt=`${officer.name}, ${officer.role}`;
      img.loading='lazy';img.decoding='async';
      // Optional crop focus in data/officers.js, e.g. photoPosition: '50% 20%'.
      // Keep values inside the image frame (0–100%) and ignore invalid input.
      const crop = String(officer.photoPosition || '').trim();
      const match = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(crop);
      if (match && Number(match[1]) <= 100 && Number(match[2]) <= 100) {
        img.style.objectPosition = `${match[1]}% ${match[2]}%`;
      }
      // If a photo is missing, the matching placeholder appears instead.
      img.addEventListener('error', () => img.remove(), {once: true});
      card.append(img);
    }
    const role=node('small','officer-role',officer.role);
    const name=node('strong','',/^(tbd|to be announced)$/i.test(officer.name.trim())?'To be announced':officer.name);
    card.append(role,name);
    // Personal profiles are optional and must be provided with each officer's permission.
    if(officer.linkedin){
      try {
        const url=new URL(officer.linkedin);
        if(url.protocol==='https:' && (url.hostname==='linkedin.com'||url.hostname.endsWith('.linkedin.com'))){
          const a=node('a','officer-social','LinkedIn ↗');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';
          a.setAttribute('aria-label',`Visit ${officer.name}'s LinkedIn profile`);card.append(a);
        }
      }catch(_){ /* Invalid URL: don't render a broken external link. */ }
    }
    grid.append(card);
  }
}

function renderPhotos(){
  const photos=window.SCIOLY_PHOTOS||[];if(!photos.length)return;
  const area=$('#photoHighlights');area.replaceChildren();area.className='photo-actual-grid';
  for(const photo of photos){const figure=node('figure'),image=node('img');image.src=photo.src;image.alt=photo.alt||'Club activity photo';image.loading='lazy';image.decoding='async';figure.append(image,node('figcaption','',photo.caption||''));area.append(figure);}
}
function refreshByTime(){
  const time=nowInNewYork(),upcoming=EVENTS.filter(e=>eventEnd(e)>time),past=EVENTS.filter(e=>eventEnd(e)<=time);
  const next=upcoming[0]||null;
  const state=`${next?.id||'none'}:${past.map(e=>e.id).join(',')}`;
  if(state===previousState)return;
  previousState=state;renderUpcoming(next);renderGallery(past);
}

const dialog=$('#posterDialog'),dialogImg=$('#dialogImage');
function openPoster(id){
  const idx=shownPast.findIndex(e=>e.id===id);if(idx<0)return;
  activePosterIndex=idx;lastFocusedElement=document.activeElement;updateDialog();
  if(!dialog.open)dialog.showModal();document.body.classList.add('locked');
}
function updateDialog(){
  if(activePosterIndex<0||!shownPast[activePosterIndex])return;
  const ev=shownPast[activePosterIndex];dialogImg.src=ev.poster;dialogImg.alt=`Original full-size flyer for ${ev.title}`;
  $('#dialogTitle').textContent=ev.title;$('#dialogDate').textContent=formatDate(ev.date,true);
  $('#dialogIndex').textContent=`${activePosterIndex+1} / ${shownPast.length}`;
  $('#dialogPrev').disabled=shownPast.length<2;$('#dialogNext').disabled=shownPast.length<2;
}
function shiftPoster(offset){if(!shownPast.length)return;activePosterIndex=(activePosterIndex+offset+shownPast.length)%shownPast.length;updateDialog();}
$('#dialogPrev').addEventListener('click',()=>shiftPoster(-1));$('#dialogNext').addEventListener('click',()=>shiftPoster(1));
$('#dialogClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{document.body.classList.remove('locked');dialogImg.removeAttribute('src');activePosterIndex=-1;if(lastFocusedElement?.isConnected)lastFocusedElement.focus();});
document.addEventListener('keydown',e=>{if(!dialog.open)return;if(e.key==='ArrowLeft'){e.preventDefault();shiftPoster(-1);}else if(e.key==='ArrowRight'){e.preventDefault();shiftPoster(1);}});

const toggle=$('#mobileToggle'),mobileNav=$('#mobileNav');
function setMenu(open){toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');mobileNav.hidden=!open;}
toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
mobileNav.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});
document.addEventListener('click',e=>{if(!mobileNav.hidden&&!mobileNav.contains(e.target)&&!toggle.contains(e.target))setMenu(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open)setMenu(false);});
window.addEventListener('resize',()=>{if(innerWidth>900)setMenu(false);},{passive:true});
const progress=$('#scrollProgress'),header=$('#siteHeader');let ticking=false;
function handleScroll(){ticking=false;header.classList.toggle('is-scrolled',window.scrollY>30);const total=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${total>0?Math.min(100,Math.max(0,scrollY/total*100)):0}%`;}
window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(handleScroll);ticking=true;}},{passive:true});handleScroll();
if('IntersectionObserver' in window){
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.documentElement.classList.add('reveal-ready');
    const observer=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting){en.target.classList.add('visible');observer.unobserve(en.target);}}, {threshold:.09});
    $$('[data-reveal]').forEach(item=>observer.observe(item));
  }
  const sections=['meet','posters','volunteer','about'];
  const observer=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting)$$('[data-nav]').forEach(link=>link.classList.toggle('active',link.dataset.nav===en.target.id));},{rootMargin:'-28% 0px -60% 0px'});
  sections.forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el);});
}
$$('.spotlight').forEach(element=>element.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const rect=element.getBoundingClientRect();element.style.setProperty('--sx',`${e.clientX-rect.left}px`);element.style.setProperty('--sy',`${e.clientY-rect.top}px`);}));
$('#heroArt').addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--mx',`${e.clientX-r.left}px`);e.currentTarget.style.setProperty('--my',`${e.clientY-r.top}px`);});
setLink();renderOfficers();renderPhotos();renderVolunteering();refreshByTime();
// Keep the featured poster and archive correct even if someone leaves the page open.
setInterval(refreshByTime,60000);
