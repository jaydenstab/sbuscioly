#!/usr/bin/env python3
"""Apply two targeted updates to a local checkout of jaydenstab/sbuscioly.

Run from the repository folder: python3 update_sbuscioly.py
No network access, account credentials, or third-party Python packages required.
"""

from pathlib import Path
import sys

ROOT = Path.cwd()
FILES = [ROOT / "index.html", ROOT / "data/site.js", ROOT / "MAINTENANCE.md"]
missing = [str(path.relative_to(ROOT)) for path in FILES if not path.is_file()]
if missing:
    sys.exit("Not in the sbuscioly project folder. Missing: " + ", ".join(missing))

html_file, site_file, maintenance_file = FILES
html = html_file.read_text(encoding="utf-8")
site = site_file.read_text(encoding="utf-8")
maintenance = maintenance_file.read_text(encoding="utf-8")
changes = []


def replace_once(source, before, after, description):
    if after in source:
        print(f"Already updated: {description}")
        return source
    if before in source:
        if source.count(before) != 1:
            raise ValueError(f"Expected one match for {description}, found {source.count(before)}")
        changes.append(description)
        return source.replace(before, after, 1)
    raise ValueError(
        f"Cannot safely update {description}: expected original text was not found. "
        "Review your local version before applying the change."
    )

try:
    # Preserve the two-action hero design. The archive remains in the navigation.
    html = replace_once(
        html,
        '<a class="text-link" href="#posters">See past GBMs <span aria-hidden="true">↗</span></a>',
        '<a class="text-link" href="https://www.instagram.com/stonybrookscioly/" '
        'target="_blank" rel="noopener noreferrer">Get club updates '
        '<span aria-hidden="true">↗</span></a>',
        "homepage Get club updates link",
    )
    html = replace_once(
        html,
        '<p>There’s no sign-up. Come by, bring a friend if you’d like, and try that week’s activity.</p>',
        '<p>No registration is needed to attend a GBM—just stop by. '
        'For activity announcements and schedule changes, follow us on Instagram.</p>',
        "clarify meeting attendance versus announcements",
    )

    # Do not assert that the SBEngaged feed is the club's verified direct page.
    site = replace_once(
        site,
        "sbengagedLabel: 'Find us on SBEngaged'",
        "sbengagedLabel: 'Browse SBEngaged'",
        "make SBEngaged link label accurate while its target is unverified",
    )
    site = replace_once(
        site,
        '/* This currently points to the verified SBEngaged group directory.\n'
        "   Once you have your club's exact SBEngaged profile URL, paste it below.\n"
        ' */',
        '/* This URL has not been independently confirmed as the club\'s direct public profile.\n'
        '   Verify the destination in a browser before replacing the generic label.\n'
        '   Once verified, paste the official club page URL below.\n'
        ' */',
        "clarify SBEngaged verification status in source",
    )

    maintenance = replace_once(
        maintenance,
        'Keep this file in the GitHub repository. At each E-Board transition, give new officers access to the organization repo, verify contact details, and review the website once per semester.',
        '''This site is maintained in the personal GitHub repository
[`jaydenstab/sbuscioly`](https://github.com/jaydenstab/sbuscioly) and published at
[https://sbuscioly.club](https://sbuscioly.club) through GitHub Pages. The domain
is managed separately through Porkbun.

## Maintainer access and future handoffs

The repository belongs to the `jaydenstab` personal GitHub account, **not** a
club-owned GitHub organization. The owner currently controls repository settings.
Trusted contributors can still help edit and publish the site.

1. Ask the new maintainer for their personal GitHub username.
2. The repository owner opens **Settings → Collaborators → Add people** in
   `jaydenstab/sbuscioly` and invites that account.
3. The invitee accepts the invitation. Collaborators can work on the code and
   push changes; ask them to use branches and pull requests for review.
4. Before an E-Board handoff, test that at least one new maintainer can make a
   small, reviewed update and verify the GitHub Pages deployment.
5. Review collaborator access every semester and remove people who no longer
   need to maintain the site. Never share personal GitHub or Porkbun passwords.
6. Separately document, in a secure place outside this public repository, who
   is responsible for domain renewal and DNS changes in Porkbun.

A collaborator does not become the owner of a personal repository. If the club
later needs independent ownership, plan a repository transfer to a club-managed
GitHub organization and recheck GitHub Pages and domain settings afterward.
''',
        "replace outdated organization-repository handoff guidance",
    )

    maintenance = replace_once(
        maintenance,
        '## Replace the directory link with your own SBEngaged page\n\n'
        'Copy the exact URL from your public club page in SBEngaged, open `data/site.js`, and change `sbengagedUrl` and `sbengagedLabel`. Don\'t guess the URL.',
        '''## Announcements and SBEngaged links

- The homepage's **Get club updates** link points to the same
  `@stonybrookscioly` Instagram account used in the Contact section of
  `index.html`. Verify that account is still in use before changing it.
- Anyone can attend a GBM without registering. Following the club's Instagram
  is optional and helps visitors learn about announcements or schedule changes.
- `data/site.js` controls the SBEngaged link in the Contact section. The
  currently configured URL has **not** been independently confirmed as the
  club's specific public profile. Open it and verify the destination; until
  then, keep the link label generic ("Browse SBEngaged").
- When the exact official club profile is confirmed, update `sbengagedUrl` and
  `sbengagedLabel` in `data/site.js`. Do not guess the destination.''',
        "document updates versus attendance and SBEngaged verification",
    )

    maintenance = replace_once(
        maintenance,
        'If you rename the GitHub organization or buy a domain, update the **`og:url`**, **`og:image`**, and **`twitter:image`** values in `index.html`. Use complete `https://` URLs. Test the share card on the real published site (not a local HTML file). Social apps may cache an old preview.',
        'The current canonical URL is `https://sbuscioly.club/`. If the domain changes, '
        'update the **canonical link**, **`og:url`**, **`og:image`**, and '
        '**`twitter:image`** in `index.html`, and review the `CNAME` file, '
        'GitHub Pages custom-domain setting, and Porkbun DNS records. Use full '
        '`https://` URLs. Test social previews on the published website; '
        'social platforms may cache older previews.',
        "correct domain-maintenance guidance",
    )

    maintenance = replace_once(
        maintenance,
        '- Does the upcoming event card show the right title and date?',
        '- Does the homepage **Get club updates** link open the correct Instagram account?\n'
        '- Has the SBEngaged destination been checked, and is its label accurate?\n'
        '- Does the upcoming event card show the right title and date?',
        "add link verification to the pre-push checklist",
    )

except ValueError as error:
    sys.exit(f"No files changed. {error}")

if not changes:
    print("All requested updates are already present. Nothing to write.")
else:
    html_file.write_text(html, encoding="utf-8")
    site_file.write_text(site, encoding="utf-8")
    maintenance_file.write_text(maintenance, encoding="utf-8")
    print(f"Updated {len(changes)} sections across index.html, data/site.js and MAINTENANCE.md")
    print("Review the result with: git diff -- index.html data/site.js MAINTENANCE.md")
    print("Then commit only those three files.")
