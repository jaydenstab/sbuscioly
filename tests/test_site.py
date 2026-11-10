from __future__ import annotations

from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import sys
import unittest
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index.html", "meetings.html", "about.html", "volunteer.html")


class PageInventory(HTMLParser):
    INTERACTIVE = {"a", "button", "input", "select", "textarea"}
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.id_counts: dict[str, int] = {}
        self.links: list[str] = []
        self.stack: list[str] = []
        self.nested_interactives: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            element_id = values["id"] or ""
            self.ids.add(element_id)
            self.id_counts[element_id] = self.id_counts.get(element_id, 0) + 1
        for attribute in ("href", "src"):
            if values.get(attribute):
                self.links.append(values[attribute] or "")
        for attribute in ("srcset", "imagesrcset"):
            for candidate in (values.get(attribute) or "").split(","):
                if candidate.strip():
                    self.links.append(candidate.strip().split()[0])
        if tag in self.INTERACTIVE:
            parent = next((item for item in reversed(self.stack) if item in self.INTERACTIVE), None)
            if parent:
                self.nested_interactives.append((parent, tag))
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in self.stack:
            index = len(self.stack) - 1 - self.stack[::-1].index(tag)
            del self.stack[index:]


def inventory(page: Path) -> PageInventory:
    parser = PageInventory()
    parser.feed(page.read_text(encoding="utf-8"))
    return parser


class SiteValidationTests(unittest.TestCase):
    def test_generated_pages_are_current(self) -> None:
        result = subprocess.run(
            [sys.executable, "tools/build_site.py", "--check"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_local_links_and_fragments_resolve(self) -> None:
        page_ids = {name: inventory(ROOT / name).ids for name in PAGES}
        for name in PAGES:
            for link in inventory(ROOT / name).links:
                parsed = urlsplit(link)
                if parsed.scheme or parsed.netloc:
                    continue
                target_path = (ROOT / name).parent / parsed.path
                if parsed.path:
                    self.assertTrue(target_path.is_file(), f"{name}: missing {link}")
                    target_name = target_path.relative_to(ROOT).as_posix()
                else:
                    target_name = name
                if parsed.fragment:
                    self.assertIn(parsed.fragment, page_ids.get(target_name, inventory(target_path).ids if parsed.path else page_ids[name]), f"{name}: missing #{parsed.fragment}")

    def test_schedule_config_is_the_generated_schedule_source(self) -> None:
        config = json.loads((ROOT / "data/club.json").read_text(encoding="utf-8"))
        meeting = config["meeting"]
        for name in ("index.html", "meetings.html"):
            html = (ROOT / name).read_text(encoding="utf-8")
            self.assertIn(meeting["day"], html)
            self.assertIn(meeting["building"], html)
            self.assertIn(meeting["room"], html)
            self.assertIn(meeting["attendanceNote"], html)
            self.assertNotIn("@@MEETING_", html)

    def test_event_posters_exist(self) -> None:
        source = (ROOT / "data/events.js").read_text(encoding="utf-8")
        import re
        for poster in re.findall(r"poster:\s*'([^']+)'", source):
            self.assertTrue((ROOT / poster).is_file(), f"Missing event poster: {poster}")

    def test_pages_have_unique_ids_and_no_nested_interactive_controls(self) -> None:
        for name in PAGES:
            page = inventory(ROOT / name)
            duplicates = sorted(element_id for element_id, count in page.id_counts.items() if count > 1)
            self.assertEqual(duplicates, [], f"{name}: duplicate IDs {duplicates}")
            self.assertEqual(page.nested_interactives, [], f"{name}: nested interactive controls {page.nested_interactives}")


if __name__ == "__main__":
    unittest.main()
