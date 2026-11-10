#!/usr/bin/env python3
"""Render shared site templates and verify committed static output."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote_plus
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


ROOT = Path(__file__).resolve().parents[1]
INCLUDES = ROOT / "_includes"
CLUB_CONFIG = ROOT / "data" / "club.json"
PAGES = {
    "index.html": "home",
    "meetings.html": "meetings",
    "volunteer.html": "volunteer",
    "about.html": "about",
}
REQUIRED_FIELDS = {
    "index.html": {"headline": 1, "location": 1, "attendance": 1, "updates": 1},
    "meetings.html": {"day": 1, "time": 1, "location": 1, "building": 1, "attendance": 1, "updates": 1},
}
FRONT_MATTER = re.compile(r"\A---\s*\nlayout: null\n---\s*\n")
HEADER_INCLUDE = re.compile(r'{% include site-header.html current="([^"]+)" %}')
LIQUID_CONDITION = re.compile(r"{% if current_page == '([^']+)' %}(.*?){% endif %}", re.S)
HEADER_MARKERS = ("<!-- SHARED HEADER START -->", "<!-- SHARED HEADER END -->")
FOOTER_MARKERS = ("<!-- SHARED FOOTER START -->", "<!-- SHARED FOOTER END -->")
CONFIG_MARKER = "<!-- CLUB CONFIG -->"
ASSET_URL = re.compile(r'(?P<attr>(?:src|href)=["\'])\./(?P<path>[^"\']+\.(?:css|js))(?:\?v=[^"\']*)?(?P<end>["\'])')


def marked(content: str, markers: tuple[str, str]) -> str:
    return f"{markers[0]}\n{content.strip()}\n{markers[1]}"


def replace_marked(page: str, markers: tuple[str, str], content: str) -> str:
    pattern = re.compile(re.escape(markers[0]) + r".*?" + re.escape(markers[1]), re.S)
    replacement = marked(content, markers)
    if not pattern.search(page):
        raise ValueError(f"Could not find generated section {markers[0]}")
    return pattern.sub(lambda _: replacement, page, count=1)


def render_header(template: str, current_page: str) -> str:
    template = template.replace("{% assign current_page = include.current %}", "")
    return LIQUID_CONDITION.sub(
        lambda condition: condition.group(2) if condition.group(1) == current_page else "",
        template,
    )


def display_time(value: str) -> str:
    hour, minute = (int(part) for part in value.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    hour12 = hour % 12 or 12
    return f"{hour12}{f':{minute:02d}' if minute else ''} {suffix}"


def asset_version(path: str) -> str:
    file_path = ROOT / path
    if not file_path.is_file():
        raise ValueError(f"Referenced local asset does not exist: {path}")
    return hashlib.sha256(file_path.read_bytes()).hexdigest()[:12]


def version_assets(page: str) -> str:
    def version(match: re.Match[str]) -> str:
        path = match.group("path")
        version = asset_version(path)
        return f'{match.group("attr")}./{path}?v={version}{match.group("end")}'

    return ASSET_URL.sub(version, page)


def render_config(config: dict) -> str:
    safe_json = json.dumps(config, ensure_ascii=False, separators=(",", ":"))
    safe_json = safe_json.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'<script type="application/json" id="clubConfig">{safe_json}</script>'


def fill_field(page: str, name: str, value: str) -> str:
    pattern = re.compile(
        rf'(?P<start><(?P<tag>[A-Za-z][\w:-]*)\b(?=[^>]*\bdata-meeting-field=["\']{re.escape(name)}["\'])[^>]*>).*?(?P<end></(?P=tag)\s*>)',
        re.S,
    )
    return pattern.sub(lambda match: match.group("start") + html.escape(value) + match.group("end"), page)


def fill_map_link(page: str, meeting: dict) -> str:
    query = quote_plus(f"{meeting['building']} Stony Brook University")
    href = f"https://www.google.com/maps/search/?api=1&amp;query={html.escape(query)}"
    pattern = re.compile(r'(<a\b(?=[^>]*\bdata-meeting-map-link=["\']true["\'])[^>]*\bhref=)["\'][^"\']*["\']', re.I)
    return pattern.sub(lambda match: f'{match.group(1)}"{href}"', page)


def fill_config(page: str, config: dict) -> str:
    rendered = render_config(config)
    if CONFIG_MARKER in page:
        page = page.replace(CONFIG_MARKER, rendered, 1)
    else:
        config_script = re.compile(r'<script\b(?=[^>]*\bid=["\']clubConfig["\'])[^>]*>.*?</script>', re.S)
        if not config_script.search(page):
            raise ValueError("Could not find generated club configuration block")
        page = config_script.sub(lambda _: rendered, page, count=1)

    meeting = config["meeting"]
    fields = {
        "day": meeting["day"],
        "time": f"{display_time(meeting['startTime'])}–{display_time(meeting['endTime'])}",
        "location": f"{meeting['building']} {meeting['room']}",
        "building": meeting["building"],
        "attendance": meeting["attendanceNote"],
        "updates": meeting["updatesNote"],
        "headline": f"Every {meeting['day']}, {display_time(meeting['startTime'])}–{display_time(meeting['endTime'])}",
    }
    for name, value in fields.items():
        page = fill_field(page, name, value)
    return fill_map_link(page, meeting)


def validate_config(config: dict) -> None:
    meeting = config.get("meeting", {})
    required = ("day", "startTime", "endTime", "timeZone", "building", "room", "attendanceNote", "updatesNote")
    missing = [key for key in required if not isinstance(meeting.get(key), str) or not meeting[key].strip()]
    if missing:
        raise ValueError(f"data/club.json is missing meeting values: {', '.join(missing)}")
    time_pattern = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    if not time_pattern.fullmatch(meeting["startTime"]) or not time_pattern.fullmatch(meeting["endTime"]):
        raise ValueError("Meeting startTime and endTime must use 24-hour HH:MM format")
    try:
        ZoneInfo(meeting["timeZone"])
    except ZoneInfoNotFoundError as error:
        raise ValueError(f"Unknown meeting time zone: {meeting['timeZone']}") from error


def render_page(filename: str, current_page: str, config: dict) -> str:
    path = ROOT / filename
    html_text = FRONT_MATTER.sub("", path.read_text(encoding="utf-8"))
    header_source = (INCLUDES / "site-header.html").read_text(encoding="utf-8")
    footer_source = (INCLUDES / "site-footer.html").read_text(encoding="utf-8")
    header = render_header(header_source, current_page)

    include_match = HEADER_INCLUDE.search(html_text)
    if include_match:
        html_text = HEADER_INCLUDE.sub(marked(header, HEADER_MARKERS), html_text, count=1)
    else:
        html_text = replace_marked(html_text, HEADER_MARKERS, header)

    footer_include = "{% include site-footer.html %}"
    if footer_include in html_text:
        html_text = html_text.replace(footer_include, marked(footer_source, FOOTER_MARKERS), 1)
    else:
        html_text = replace_marked(html_text, FOOTER_MARKERS, footer_source)

    if CONFIG_MARKER in html_text or re.search(r'<script\b(?=[^>]*\bid=["\']clubConfig["\'])', html_text):
        html_text = fill_config(html_text, config)
    elif "data-meeting-field=" in html_text or "@@MEETING_" in html_text:
        raise ValueError(f"Meeting config fields exist without a config block in {filename}")
    if "@@MEETING_" in html_text or CONFIG_MARKER in html_text:
        raise ValueError(f"Unexpanded site configuration marker remains in {filename}")
    for field, expected_count in REQUIRED_FIELDS.get(filename, {}).items():
        count = len(re.findall(rf'\bdata-meeting-field=["\']{re.escape(field)}["\']', html_text))
        if count != expected_count:
            raise ValueError(f"Expected {expected_count} recurring meeting field(s) for {field} in {filename}, found {count}")
    if filename == "meetings.html" and html_text.count('data-meeting-map-link="true"') != 1:
        raise ValueError("Meetings page must include one generated meeting directions link")
    if "{% " in html_text or "{{ " in html_text:
        raise ValueError(f"Unexpanded template syntax remains in {filename}")
    return version_assets(html_text)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if committed HTML differs from generated output")
    args = parser.parse_args()

    try:
        config = json.loads(CLUB_CONFIG.read_text(encoding="utf-8"))
        validate_config(config)
        for filename, current_page in PAGES.items():
            expected = render_page(filename, current_page, config)
            output_path = ROOT / filename
            if args.check:
                actual = output_path.read_text(encoding="utf-8")
                if actual != expected:
                    print(f"Stale generated page: {filename}", file=sys.stderr)
                    return 1
                print(f"Up to date: {filename}")
            else:
                output_path.write_text(expected, encoding="utf-8")
                print(f"Rendered {filename}")
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"Site build failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
