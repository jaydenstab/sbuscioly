# SBU SciOly

The website for **SBU Science Olympiad**, a student-run club at Stony Brook University.

**Website:** https://sbuscioly.club

## About

SBU Science Olympiad brings together students interested in science, problem-solving, and collaborative learning. Our activities include general body meetings (GBMs), Science Olympiad-inspired challenges, and opportunities to get involved in science education and volunteering.

This website serves as a central resource for club information, meeting schedules, event flyers, announcements, and activities.

## Website Features

- **Meetings & Events:** Upcoming GBMs, event details, and an archive of past meetings.
- **Event Gallery:** Meeting flyers with an interactive, full-screen image viewer.
- **Volunteering:** Information and updates on the club's science education and outreach activities.
- **Club Information:** Details about the organization, its leadership, and how to get involved.
- **Responsive Design:** A layout designed for desktop and mobile devices.

## Technology

The website is built with:

- HTML5
- CSS3
- Vanilla JavaScript

It uses no frontend framework or build system.

**Hosting:** GitHub Pages  
**Domain:** [sbuscioly.club](https://sbuscioly.club)

## Project Structure

| File / Directory | Description |
|---|---|
| `index.html` | Main website structure and metadata |
| `styles.css` | Website styling and responsive layout |
| `script.js` | Interactive features and event display logic |
| `data/` | Club events, officers, volunteering, photos, and configuration |
| `posters/` | Event flyers and optimized gallery thumbnails |
| `assets/` | Website icons and social-sharing images |
| `MAINTENANCE.md` | Website maintenance and updating instructions |

## Running Locally

Clone the repository:

```bash
git clone https://github.com/jaydenstab/sbuscioly.git
cd sbuscioly
```

Start a local development server:

```bash
python3 -m http.server 8000
```

Visit http://localhost:8000 in your browser.

Alternatively, open the project in Visual Studio Code and use the Live Server extension.

## Maintenance

Website content is maintained through the JavaScript files in `data/`. Changes pushed to the main branch are published through GitHub Pages.

For instructions on updating events, flyers, and other club information, see [`MAINTENANCE.md`](MAINTENANCE.md).

## Contact

For club information, meeting announcements, and ways to get involved, visit [sbuscioly.club](https://sbuscioly.club).
