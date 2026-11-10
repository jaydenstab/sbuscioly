# SBU SciOly

The website for **SBU Science Olympiad**, a student-run club at Stony Brook University.

**Website:** [sbuscioly.club](https://sbuscioly.club)

The site helps new and returning members find the weekly meeting schedule, current activity announcements, flyers, volunteer opportunities, club leadership, and contact links.

## Pages

- **Home:** Club introduction, recurring meeting details, attendance information, and the next confirmed activity.
- **Meetings:** Weekly schedule, directions, visitor information, activity updates, calendar links, and past flyers.
- **Volunteering:** Tournament participation and verified updates.
- **About:** Club overview, officers, approved meeting photos, and contact/social links.

## Technology and hosting

The site uses static HTML, CSS, vanilla JavaScript, and a small Python build script. It is hosted on GitHub Pages. There is no frontend framework or package manager.

`data/club.json` is the source of truth for recurring meeting information. The builder renders crawlable schedule text, expands `_includes/`, and applies stable content hashes to local CSS and JavaScript. Committed HTML is standalone and works on GitHub Pages without a server-side build step.

## Local development

```bash
python3 tools/build_site.py
python3 tools/build_site.py --check
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.js
python3 -m http.server 8000
```

Open <http://127.0.0.1:8000> to preview the site. The first command regenerates the committed pages. The remaining validation commands check for stale output, broken local links, schedule consistency, and volunteer date/status regressions. GitHub Actions runs the automated checks on pushes and pull requests.

## Project structure

| File or directory | Purpose |
|---|---|
| `index.html`, `meetings.html`, `about.html`, `volunteer.html` | Static pages |
| `_includes/` | Shared header and footer templates |
| `tools/build_site.py` | Static page generation, cache hashes, and stale-output check |
| `data/club.json` | Recurring meeting configuration |
| `data/events.js` | Confirmed GBM activities and flyer paths |
| `data/volunteering.js` | Volunteer dates, verification state, and recap notes |
| `data/officers.js` | Current officer names and approved profile details |
| `data/photos.js` | Approved meeting photo gallery entries |
| `data/site.js` | SBEngaged and Instagram destinations |
| `*-page.js` and `script.js` | Page-specific rendering and shared navigation |
| `tests/` | Python build/link checks and Node status regression tests |
| `MAINTENANCE.md` | Officer instructions for updating the site |

See [MAINTENANCE.md](MAINTENANCE.md) for content updates, rebuild steps, previewing, and validation.
