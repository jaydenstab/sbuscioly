from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_site", ROOT / "tools" / "build_site.py")
BUILD = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(BUILD)


class BuildSiteTests(unittest.TestCase):
    def test_check_detects_template_drift_without_rewriting_output(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "_includes").mkdir()
            (root / "data").mkdir()
            (root / "_includes/site-header.html").write_text("<header>First template</header>", encoding="utf-8")
            (root / "_includes/site-footer.html").write_text("<footer>Footer</footer>", encoding="utf-8")
            config = {"meeting": {
                "day": "Tuesday", "startTime": "19:00", "endTime": "20:00", "timeZone": "America/New_York",
                "building": "Frey Hall", "room": "305", "attendanceNote": "Welcome.", "updatesNote": "See Instagram."
            }}
            (root / "data/club.json").write_text(json.dumps(config), encoding="utf-8")
            source = "\n".join((
                "<html><body>", BUILD.HEADER_MARKERS[0], "old header", BUILD.HEADER_MARKERS[1],
                '<p data-meeting-field="headline">Every Tuesday, 7–8 PM</p>',
                '<p data-meeting-field="location">Frey Hall 305</p>',
                '<p data-meeting-field="attendance">Welcome.</p>',
                '<p data-meeting-field="updates">See Instagram.</p>',
                '<a data-meeting-map-link="true" href="before">Directions</a>',
                "<!-- CLUB CONFIG -->", BUILD.FOOTER_MARKERS[0], "old footer", BUILD.FOOTER_MARKERS[1], "</body></html>"
            ))
            (root / "index.html").write_text(source, encoding="utf-8")

            old_root, old_includes, old_config, old_pages = BUILD.ROOT, BUILD.INCLUDES, BUILD.CLUB_CONFIG, BUILD.PAGES
            old_argv = sys.argv
            try:
                BUILD.ROOT = root
                BUILD.INCLUDES = root / "_includes"
                BUILD.CLUB_CONFIG = root / "data/club.json"
                BUILD.PAGES = {"index.html": "home"}
                sys.argv = ["build_site.py"]
                with redirect_stdout(io.StringIO()):
                    self.assertEqual(BUILD.main(), 0)
                generated = (root / "index.html").read_text(encoding="utf-8")
                self.assertIn('<p data-meeting-field="headline">Every Tuesday, 7 PM–8 PM</p>', generated)
                self.assertIn("Frey+Hall+Stony+Brook+University", generated)

                config["meeting"].update(day="Thursday", building="New Building")
                (root / "data/club.json").write_text(json.dumps(config), encoding="utf-8")
                with redirect_stdout(io.StringIO()):
                    self.assertEqual(BUILD.main(), 0)
                generated = (root / "index.html").read_text(encoding="utf-8")
                self.assertIn('<p data-meeting-field="headline">Every Thursday, 7 PM–8 PM</p>', generated)
                self.assertIn("New+Building+Stony+Brook+University", generated)

                (root / "_includes/site-header.html").write_text("<header>Changed template</header>", encoding="utf-8")
                sys.argv = ["build_site.py", "--check"]
                with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                    self.assertEqual(BUILD.main(), 1)
                self.assertEqual((root / "index.html").read_text(encoding="utf-8"), generated)
            finally:
                BUILD.ROOT, BUILD.INCLUDES, BUILD.CLUB_CONFIG, BUILD.PAGES = old_root, old_includes, old_config, old_pages
                sys.argv = old_argv

    def test_asset_versions_are_content_based(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            asset = root / "styles.css"
            asset.write_text("body { color: black; }", encoding="utf-8")
            old_root = BUILD.ROOT
            try:
                BUILD.ROOT = root
                first = BUILD.asset_version("styles.css")
                self.assertEqual(first, BUILD.asset_version("styles.css"))
                asset.write_text("body { color: white; }", encoding="utf-8")
                self.assertNotEqual(first, BUILD.asset_version("styles.css"))
            finally:
                BUILD.ROOT = old_root


if __name__ == "__main__":
    unittest.main()
