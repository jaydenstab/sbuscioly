# Maintaining the SBU SciOly website

The site is a static website. Make content changes in `data/`, shared layout changes in `_includes/`, and styling or behavior changes in CSS/JavaScript. After any source change, rebuild and run the validation commands below before committing.

## Rebuild and validate

From the repository root:

```bash
python3 tools/build_site.py
python3 tools/build_site.py --check
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.js
```

The build expands `_includes/`, inserts recurring meeting details from `data/club.json`, and writes deterministic SHA-256 content hashes into local CSS and JavaScript URLs. It updates only generated sections, config values, and asset URLs in the four HTML pages; page content remains hand maintained. `--check` is read-only and fails if a template, data value, or asset changed without regenerating the pages. GitHub Actions runs the checks on pushes and pull requests.

Preview after rebuilding:

```bash
python3 -m http.server 8000
```

Open <http://127.0.0.1:8000>. Stop the server with Ctrl+C.

## Recurring meetings

Edit `data/club.json` to update the weekly meeting day, time, time zone, building, room, visitor note, or schedule-change note. Use 24-hour `HH:MM` values and a valid IANA time zone. The builder generates the crawlable schedule text and a small runtime config from this file. Do not copy the schedule into HTML or JavaScript. Rebuild after changing it.

The time zone also determines when event cards move from upcoming activities to the flyer archive and how volunteer dates are interpreted.

## Announce or edit a GBM

1. Add the approved flyer image under `posters/` and optionally a WebP preview under `posters/thumbs/`.
2. Add or update the event object in `data/events.js`, using a unique `id`, the confirmed title, ISO date (`YYYY-MM-DD`), 24-hour start and end times, type, and exact poster path.
3. Do not add tentative or unconfirmed activities. Past events move to the archive after their end time in the configured New York time zone.
4. Rebuild and validate. The homepage and Meetings page use the same event data and calendar links.

The original poster is used in the full-size viewer. If a thumbnail is missing, the archive falls back to the original image.

## Volunteer updates

Edit `data/volunteering.js`:

- `tentative`: plans are not confirmed.
- `confirmed`: participation is confirmed, but the tournament has not yet occurred.
- `completed`: use only after confirming club members attended. This means verified completion and displays as completed immediately, including on the event date.
- `canceled` or `cancelled`: the opportunity was canceled.

After a confirmed event date passes, the page says **Recap pending** until the entry is changed to `completed` and the note records a factual recap. Dates must be valid ISO dates. Entries with missing or invalid dates are shown safely as undated and are not treated as past events.

## Meeting photos

Only publish photos members have approved for public sharing. Add images to the repository under `photos/`, then edit `data/photos.js`. Array order is display order; remove an entry to remove its photo. Each entry needs a local `src` path and meaningful `alt` text. `caption` is optional.

```js
window.SCIOLY_PHOTOS = [
  {
    src: 'photos/egg-drop-team.jpg',
    alt: 'Members testing their Egg Drop designs',
    caption: 'Egg Drop meeting'
  }
];
```

For responsive image delivery, you may also provide local width candidates:

```js
srcset: 'photos/egg-drop-team-600.webp 600w, photos/egg-drop-team-1200.webp 1200w'
```

The About page displays the gallery in this order, loads images lazily, and shows a friendly fallback for an empty list or a missing image. Do not link to images hosted elsewhere. Use photos the club owns or assets with a license that permits website reuse; retain any required creator, source, and license attribution on the page or in the asset documentation.

## Officers

Edit `data/officers.js` with current officer names and roles. Use `name: 'Vacant'` for an open role; do not use a placeholder person. Keep `photo` and `linkedin` empty unless the officer approved publication. Store approved local portraits under `eboard/`. LinkedIn links must use HTTPS. An optional `photoPosition` such as `'50% 20%'` adjusts the crop.

## Contact and social links

Edit `data/site.js` for the club’s SBEngaged and Instagram links, the email list form, and the future GBM idea form. Use the current public URLs; the Meetings page reads those form destinations from this file. Email and other contact information in `about.html` should be kept current by an officer. Rebuild after changing data so the generated asset hashes are refreshed.

## Before publishing

- Run all four commands in **Rebuild and validate**.
- Review Home, Meetings, About, and Volunteering at desktop and phone widths.
- Confirm meeting room/time, event dates and flyers, social links, officer details, and approved photo alt text.
- Review the Git diff so generated changes are limited to expected pages and no unrelated edits were removed.
- Do not store private payment details, student records, or contact lists in this public repository.
