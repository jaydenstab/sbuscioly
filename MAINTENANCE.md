# Updating the SBU SciOly website

Keep this file in the GitHub repository. At each E-Board transition, give new officers access to the organization repo, verify contact details, and review the website once per semester.

## Publish a new GBM flyer (roughly 2 minutes)

1. Export the original flyer as a JPG or PNG. Use a lowercase filename with hyphens, e.g. `puzzle-night.jpg`.
2. Add the image to `posters/`.
3. Edit `data/events.js`. Add the actual title, date, meeting start and end time, type, and poster path. Example:

```js
{
  id: 'unique-puzzle-2027',
  title: 'Actual confirmed activity',
  date: '2027-02-02',
  startTime: '19:00',
  endTime: '20:00',
  type: 'Puzzles & games',
  poster: 'posters/puzzle-night.jpg'
},
```

4. Save and commit your changes to GitHub. The site features the next announced GBM and automatically moves it to Past GBMs after its scheduled end time in New York.
5. Optional but recommended: create a 700-pixel-wide WebP thumbnail in `posters/thumbs/` with the same basename, e.g. `puzzle-night.webp`. If you skip this, the website automatically loads the original JPG/PNG instead.

Do not announce a GBM in the data file before the club has actually confirmed it. You do **not** need to edit `index.html` to publish a new event.

## Update Nassau East or another volunteer event

Edit `data/volunteering.js`:

- `status: 'tentative'` for unconfirmed plans.
- `status: 'confirmed'` when participation has been confirmed, but the event has not yet been completed.
- `status: 'completed'` **only after confirming your club actually volunteered**, and change `note` to a factual past-tense recap.

Once a date passes while an entry remains confirmed, the site shows **Recap pending**. This is intentional.

## Edit the E-Board

Edit `data/officers.js`. Use the correct name and position. Set `photo: ''` and `linkedin: ''` until each officer provides a photo/profile and agrees to have it published. Images can go in `eboard/` and be referenced as `eboard/filename.jpg`. The code displays a LinkedIn link only for a valid LinkedIn HTTPS URL.

### Fine-tune individual officer photos

All photos use identical square frames, so the card layout stays compact.
The default cropping focuses near the upper part of each image. To adjust a single
photo without changing anyone else's, add the optional `photoPosition` property
**inside that officer's existing object** in `data/officers.js`:

```js
{
  name: 'Samuel Wang',
  role: 'Secretary',
  photo: 'eboard/samuel-wang.jpg',
  photoPosition: '50% 20%', // horizontal 50%, vertical 20%
  linkedin: ''
}
```

`50% 50%` centers the photo. `50% 15%` shifts the crop toward the top of the
original image. Values must be two percentages from 0% to 100% separated by a
space. Remove the property to use the default crop.

For faster loading, consider converting large officer JPGs to small WebP files
(roughly 300–500px wide), then update each `photo` path. Keep originals privately
if you need them again. **Do not overwrite `data/officers.js` with an example**:
retain your current officer names and any photo filenames you've already added.


## Add GBM highlights

Only use photos that can be shared with appropriate consent. Store them in `photos/`, then add them to `data/photos.js`. The placeholder is replaced automatically when an entry is present.

## Replace the directory link with your own SBEngaged page

Copy the exact URL from your public club page in SBEngaged, open `data/site.js`, and change `sbengagedUrl` and `sbengagedLabel`. Don't guess the URL.

## Change the domain and sharing preview

If you rename the GitHub organization or buy a domain, update the **`og:url`**, **`og:image`**, and **`twitter:image`** values in `index.html`. Use complete `https://` URLs. Test the share card on the real published site (not a local HTML file). Social apps may cache an old preview.

## Before pushing a change

- Does the upcoming event card show the right title and date?
- Do posters open at full resolution? Are new poster filenames lowercase and exact?
- Do the meeting room and schedule still match current club announcements?
- Did a volunteer event pass, and do we have a verified recap?
- Are officers and links current and approved for publication?
- Does the site fit a phone screen, and does the menu work?
- Do `index.html`, `styles.css`, `script.js`, `data/`, `posters/`, `assets/` all exist in the repository root?

## If a poster does not load

1. Check whether the file is really inside `posters/` in the repository.
2. Check case and hyphens: `egg-drop.jpg` differs from `egg drop.jpg`.
3. Reload after GitHub Pages finishes deploying. The browser may show a cached older page.
4. A `thumbs/` preview is optional: the site should fall back to the original poster automatically.

No private payment methods, student records, or contact lists should be stored in this public GitHub repository.
