from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
import json
from datetime import date
from pathlib import Path
import re
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


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
            (root / "data/events.js").write_text('window.SCIOLY_EVENTS = [];', encoding="utf-8")
            source = "\n".join((
                "<html><body>", BUILD.HEADER_MARKERS[0], "old header", BUILD.HEADER_MARKERS[1],
                '<p data-meeting-field="headline">Every Tuesday, 7–8 PM</p>',
                '<p data-meeting-field="location">Frey Hall 305</p>',
                '<p data-meeting-field="attendance">Welcome.</p>',
                '<p data-meeting-field="updates">See Instagram.</p>',
                '<a data-meeting-map-link="true" href="before">Directions</a>',
                BUILD.SCHEDULE_NOTICE_MARKERS[0], BUILD.SCHEDULE_NOTICE_MARKERS[1],
                "<noscript>", BUILD.EVENT_FALLBACK_MARKERS[0], BUILD.EVENT_FALLBACK_MARKERS[1], "</noscript>",
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

    def test_static_volunteer_fallback_orders_future_opportunities_and_labels_explicit_closures(self) -> None:
        markup = BUILD.render_volunteer_updates([
            {"id": "old", "name": "Old recap", "date": "2024-02-01", "status": "completed"},
            {"id": "later", "name": "Later opportunity", "date": "2027-03-01", "status": "confirmed"},
            {"id": "sooner", "name": "Sooner opportunity", "date": "2027-01-01", "status": "confirmed"},
            {"id": "canceled", "name": "Canceled", "date": "2028-01-01", "status": "canceled"},
            {"id": "undated", "name": "Undated", "date": "2027-02-30", "status": "tentative"},
        ])
        names = re.findall(r"<h3>(.*?)</h3>", markup)
        self.assertEqual(names, ["Sooner opportunity", "Later opportunity", "Canceled", "Old recap", "Undated"])
        self.assertIn('<span class="timeline-status">Canceled</span>', markup)
        self.assertIn("Date to be announced", markup)

    def test_volunteer_fallback_output_is_unchanged_across_simulated_build_dates(self) -> None:
        events = [
            {"name": "Past confirmed date", "date": "2020-01-01", "status": "confirmed"},
            {"name": "Future confirmed date", "date": "2999-01-01", "status": "confirmed"},
        ]
        before_midnight = SimpleNamespace(now=lambda _zone: date(2026, 11, 11))
        after_midnight = SimpleNamespace(now=lambda _zone: date(2026, 11, 12))
        with patch.object(BUILD, "datetime", before_midnight, create=True):
            before = BUILD.render_volunteer_updates(events)
        with patch.object(BUILD, "datetime", after_midnight, create=True):
            after = BUILD.render_volunteer_updates(events)
        self.assertEqual(before, after)

    def test_volunteer_fallback_uses_ids_for_deterministic_invalid_date_order(self) -> None:
        markup = BUILD.render_volunteer_updates([
            {"id": "invalid-z", "name": "Invalid later", "date": "2026-02-30", "status": "tentative"},
            {"id": "invalid-a", "name": "Invalid earlier", "date": "not-a-date", "status": "tentative"},
        ])
        names = re.findall(r"<h3>(.*?)</h3>", markup)
        self.assertEqual(names, ["Invalid earlier", "Invalid later"])

    def test_static_event_fallback_includes_published_titles_and_dates(self) -> None:
        data = BUILD.read_assigned_json(ROOT / "data/events.js", "SCIOLY_EVENTS", "[", "]")
        fallback = BUILD.render_event_fallback(data)
        self.assertIn("Published activity dates are listed below", fallback)
        for event in data:
            self.assertIn(event["title"], fallback)
            self.assertIn(event["date"], fallback)

    def test_static_event_fallback_empty_and_populated_copy_never_claims_a_meeting_is_canceled(self) -> None:
        empty = BUILD.render_event_fallback([])
        self.assertIn("No activity dates are posted", empty)
        self.assertNotIn("canceled", empty.lower())

        populated = BUILD.render_event_fallback([
            {"id": "future", "title": "Future topic", "date": "2999-01-01", "startTime": "19:00"},
            {"id": "past", "title": "Past topic", "date": "2020-01-01", "startTime": "19:00"},
        ])
        self.assertIn("Published activity dates are listed below", populated)
        self.assertIn("Future topic", populated)
        self.assertIn("Past topic", populated)
        self.assertNotIn("No specific activity has been announced", populated)
        self.assertNotIn("canceled", populated.lower())

    def test_confirmed_schedule_notice_is_optional_and_escaped(self) -> None:
        self.assertEqual(BUILD.render_schedule_notice({"scheduleNotice": ""}), "")
        markup = BUILD.render_schedule_notice({"scheduleNotice": "No meeting on <date>."})
        self.assertIn("No meeting on &lt;date&gt;.", markup)
        self.assertIn('role="status"', markup)


if __name__ == "__main__":
    unittest.main()
