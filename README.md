# SBU SciOly website — GitHub Pages

This is the updated source site. It uses plain HTML, CSS, and JavaScript (no npm or React build required). The seven GBM flyers are included in `posters/`, and smaller `.webp` gallery previews live in `posters/thumbs/`.

## Preview before publishing

1. Download and unzip the folder.
2. Open the folder in VS Code.
3. Open `index.html` in your browser, or use the VS Code Live Server extension.
4. Check the poster viewer, mobile navigation, volunteering status, and E-Board cards.

## Live website

https://sbuscioly.club/

This is the student-run SBU Science Olympiad website, hosted
for free on GitHub Pages with a custom domain managed by Porkbun.

## Publishing updates

1. Edit and preview the website in VS Code.
2. Commit your changes and push them to the main branch.
3. Check GitHub Actions to confirm deployment succeeded.
4. Visit https://sbuscioly.club/ to verify the updates.

GitHub repository: https://github.com/jaydenstab/sbuscioly

## Files

- `index.html`: website markup, SEO/social-sharing metadata, favicon declarations.
- `styles.css`: red/white visual system and responsive styles.
- `script.js`: event automation, gallery, E-Board, links, volunteering status, interactive behaviors.
- `data/events.js`: event posters, verified GBM titles and dates.
- `data/volunteering.js`: volunteering status and notes (Nassau East is confirmed as of the provided update).
- `data/officers.js`: current officers and optional consented LinkedIn links.
- `data/photos.js`: club photos (empty pending consented photos).
- `data/site.js`: SBEngaged URL and label.
- `posters/*.jpg`: original, full-resolution flyers.
- `posters/thumbs/*.webp`: lightweight gallery-only previews; original JPGs remain for full-screen view.
- `assets/`: favicon and 1200 × 630 social-sharing preview.
- `MAINTENANCE.md`: recurring updates and troubleshooting.

## What changed in this edition

- Added a unique SciOly favicon and a social-sharing image.
- Added Open Graph/Twitter sharing tags pointing to https://sbuscioly.club/.
- Made the poster gallery lazy-load compressed `.webp` thumbnails, with an automatic fallback to the original JPG when a thumbnail is absent. The next/upcoming event still loads its original poster promptly.
- Reduced repeated meeting reminders and clarified the site's About text.
- Changed the volunteering timeline to display **Recap pending** after the date of a confirmed event, rather than implying the club actually volunteered. Only set `status: 'completed'` once verified.
- Made E-Board cards show role before name. `TBD` becomes a neutral 'To be announced' label. Optional LinkedIn links display only if a permitted LinkedIn URL is supplied.
- Updated the displayed Nassau East volunteering note to be concise, without repeating the date.

## SBEngaged profile

The current link in `data/site.js` leads to the official group directory. A direct public URL for SBU SciOly was **not verified**, so one has not been invented. Once you copy the exact public club URL from SBEngaged, replace `sbengagedUrl` and `sbengagedLabel` there.

## One content caution

Nassau East is scheduled for January 30, 2027, and your club has confirmed that it plans to volunteer. The website should not mark attendance **completed** automatically merely because the date passes. The code intentionally waits for you to verify that your members attended.
