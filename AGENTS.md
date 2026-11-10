SBUSciOly — Repository Instructions for Coding Agents
Purpose and priorities
SBUSciOly is a student-run Science Olympiad organization at Stony Brook University. This is a small static website for prospective members, current members, and volunteers.

The highest-priority visitor task is finding when and where meetings happen and how to attend. Build around accurate information, ease of use, and a credible academic identity—not decorative complexity.

Every change should improve the site without introducing repetition, visual inconsistency, or regressions.
Repository workflow
- Before editing, inspect the relevant files, README.md, MAINTENANCE.md, and git status / git diff.
- Preserve all pre-existing uncommitted changes. Do not reset, discard, or rewrite unrelated work.
- Identify the root cause and fix it at the appropriate source; do not layer workarounds on top of a broken implementation.
- Keep changes scoped to the task. Do not redesign unrelated pages or introduce speculative features.
- Do not commit, push, deploy, or overwrite external content unless the user explicitly requests it.
- If instructions conflict with verified source code or actual club facts, flag the discrepancy rather than inventing a resolution.
Architecture and content sources
- Preserve the lightweight HTML, CSS, vanilla JavaScript, and Python site-generation approach. Do not add a framework or large dependency without explicit approval.
- Verify how tools/build_site.py, _includes/, and data files work before modifying generated HTML. Update the authoritative source and regenerate output when appropriate.
- Treat data/club.json as the authoritative source for recurring meeting details, if it remains the source used by the current build. Do not duplicate schedule, room, or recurring attendance text in independently maintained files.
- Keep event, photo, officer, and volunteer data in their established sources. Page-specific JavaScript should load only where needed.
- Prefer semantic HTML, CSS variables, a small set of reusable patterns, and progressive enhancement.
- Avoid unused code, unnecessary abstraction, fragile fallbacks, and hard-coded duplicate facts.
- Keep README.md and MAINTENANCE.md aligned with actual functionality and commands.
Information architecture
Each page has a distinct job:
- Home: explain what the club is and make attending a meeting the obvious primary action.
- Meetings: show precise schedule, location, upcoming activities, whether visitors can join, and how to get updates.
- About: explain the organization, real activities, and leadership; show approved photos only where available.
- Volunteering: explain genuine opportunities, statuses, requirements, and how to participate.
Repeat critical information across pages only when it helps a visitor complete a task. Repeated factual information must draw from one authoritative source. Do not repeat the same message in adjacent headings, descriptions, badges, and cards.
Visual design: avoid generic template output
Use a restrained, contemporary academic/editorial direction. Design should feel like a credible Stony Brook science organization, not a SaaS landing-page template.
- Create hierarchy with typography, alignment, content width, whitespace, and meaningful imagery.
- Maintain consistent spacing, font sizes, colors, button treatments, radii, and responsive behavior using the site's existing design system.
- Do not default to a three-card grid, alternating feature sections, pill labels, decorative icons, oversized gradients, glassmorphism, glowing borders, or gratuitous animation.
- Add a card, badge, effect, or section only if it improves comprehension or interaction; otherwise remove it.
- Avoid multiple headings that all say “up next,” “weekly meeting,” or the equivalent within the same section.
- Do not fill empty space with promotional copy or invented statistics.
- Keep one clear primary action per section or decision point. Secondary actions should be visually subordinate.
- Ensure hero images crop well on narrow screens and text remains readable over them.
- Keep layouts deliberate at approximately 360, 390, 768, 1024, and 1440 px; do not simply shrink desktop components.
- Respect reduced-motion preferences, visible keyboard focus, semantic landmarks, and WCAG AA text contrast.
For larger design tasks, first identify unnecessary sections and competing information. Simplify before adding components. Preserve good existing design choices rather than changing styles for novelty.
Writing and factual integrity
- Use clear, natural language that a real club officer would write. Favor specific facts over promotion.
- Avoid generic copy such as “unlock your potential,” “where innovation meets passion,” “join our vibrant community,” or “discover endless possibilities.”
- One section should answer one distinct visitor question. Remove redundant explanations instead of replacing them with filler.
- Do not invent meeting dates, locations, announcements, opportunities, awards, partnerships, contacts, or officer identities.
- Use the club's existing verified contact and social links. Treat missing content honestly with concise empty states.
Images, consent, and university branding
- Prefer authentic, relevant photos taken at Stony Brook. Never present another campus as SBU.
- Use website photos only when the license or permission supports the intended use. Follow attribution and other license terms.
- Publish identifiable member photos only when appropriate consent is established according to club guidance.
- Avoid reproducing or adapting university seals, shields, logos, or other protected marks without verified authorization. Do not imply official SBU endorsement.
- Do not add external image links with uncertain rights just to improve a visual design.
Definition of done: implementation and verification
After each meaningful change:
1. Review the final diff; verify unrelated work is untouched and there is no new duplication.
2. Run the repository's documented build, validation, and test commands that apply. Do not invent command names; discover them first.
3. Verify that generated pages and shared includes remain synchronized and that local links and assets resolve.
4. Exercise relevant states: populated and empty events/photos, date-dependent volunteer statuses, and mobile navigation where affected.
5. For visual changes, open the affected pages in a browser if a browser tool is available, inspect desktop and mobile screenshots, and correct actual spacing, hierarchy, cropping, and overflow problems.
6. Check keyboard access, focus indication, contrast, responsive layout, and reduced-motion behavior where affected.
7. Run git diff --check and report any remaining failures.
8. Summarize what changed, what was actually tested, and what remains unverified. Do not claim tests or visual reviews happened if they did not.
Automated checks cannot prove a layout is good. Visual inspection cannot prove code is correct. Use both where available.
Final review question
Before finishing, ask: Did this task make the website simpler, more accurate, more coherent, and easier to maintain? If the change added visual noise, repeated copy, hidden coupling, or an avoidable regression, fix it before declaring completion.