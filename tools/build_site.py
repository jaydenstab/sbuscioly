#!/usr/bin/env python3
"""Render shared site templates and verify committed static output."""

from __future__ import annotations

import argparse
from datetime import date as calendar_date
import hashlib
import html
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote_plus, urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


ROOT = Path(__file__).resolve().parents[1]
INCLUDES = ROOT / "_includes"
CLUB_CONFIG = ROOT / "data" / "club.json"
OFFICERS_SOURCE = ROOT / "data" / "officers.js"
SITE_SOURCE = ROOT / "data" / "site.js"
OFFICER_MARKERS = ("<!-- GENERATED OFFICERS START -->", "<!-- GENERATED OFFICERS END -->")
VOLUNTEER_MARKERS = ("<!-- GENERATED VOLUNTEER UPDATES START -->", "<!-- GENERATED VOLUNTEER UPDATES END -->")
EVENT_FALLBACK_MARKERS = ("<!-- GENERATED EVENT FALLBACK START -->", "<!-- GENERATED EVENT FALLBACK END -->")
SCHEDULE_NOTICE_MARKERS = ("<!-- SCHEDULE NOTICE START -->", "<!-- SCHEDULE NOTICE END -->")
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


def read_assigned_json(path: Path, variable: str, opening: str, closing: str) -> object:
    expression = re.escape(opening) + r".*?" + re.escape(closing)
    pattern = re.compile(rf"window\.{re.escape(variable)}\s*=\s*({expression})\s*;", re.S)
    match = pattern.search(path.read_text(encoding="utf-8"))
    if not match:
        raise ValueError(f"Could not read JSON-compatible window.{variable} data from {path.relative_to(ROOT)}")
    return json.loads(match.group(1))


def valid_external_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlsplit(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


def fill_site_links(page: str, site: dict) -> str:
    targets = {
        "sbengagedUrl": ("id", "sbengagedLink"),
        "instagramUrl": ("id", "instagramLink"),
        "emailListUrl": ("data-site-link", "email-list"),
        "futureGbmIdeaUrl": ("data-site-link", "future-gbm-idea"),
    }
    for key, (attribute, identifier) in targets.items():
        value = site.get(key)
        if not valid_external_url(value):
            raise ValueError(f"data/site.js must provide an HTTPS {key}")
        pattern = re.compile(
            rf'<a\b(?=[^>]*\b{re.escape(attribute)}=["\']{re.escape(identifier)}["\'])[^>]*>',
            re.I,
        )

        def replace(match: re.Match[str]) -> str:
            tag = match.group(0)
            href = re.compile(r'\bhref=["\'][^"\']*["\']', re.I)
            replacement = f'href="{html.escape(value, quote=True)}"'
            if href.search(tag):
                return href.sub(replacement, tag, count=1)
            return tag[:-1] + f' {replacement}>'

        page = pattern.sub(replace, page)
    return page


def render_officers(officers: list[dict]) -> str:
    if not officers:
        return '<div class="eboard-empty"><p>Officer information will be added when it’s ready.</p></div>'

    cards: list[str] = []
    for officer in officers:
        if not isinstance(officer, dict):
            raise ValueError("Each data/officers.js entry must be an object")
        raw_name = str(officer.get("name", "Officer")).strip()
        name = "Vacant" if re.fullmatch(r"(?:vacant|tbd|to be announced)", raw_name, re.I) else raw_name
        role = str(officer.get("role", "Officer")).strip() or "Officer"
        if not name:
            raise ValueError("Officer names must not be empty")
        photo = officer.get("photo", "")
        image = ""
        card_class = "officer-card"
        if photo:
            if not isinstance(photo, str) or not photo.startswith("eboard/") or ".." in photo or "?" in photo or "#" in photo or not (ROOT / photo).is_file():
                raise ValueError(f"Officer photo must be an existing local eboard asset: {photo}")
            position = str(officer.get("photoPosition", "")).strip()
            position_match = re.fullmatch(r"(\d{1,3})%\s+(\d{1,3})%", position)
            style = ""
            if position_match and all(int(part) <= 100 for part in position_match.groups()):
                style = f' style="object-position: {position_match.group(1)}% {position_match.group(2)}%"'
            image = f'<img src="./{html.escape(photo, quote=True)}" alt="{html.escape(name + ", " + role, quote=True)}" loading="lazy" decoding="async">'
            if style:
                image = image.replace(' loading="lazy"', style + ' loading="lazy"')
            card_class += " officer-card--with-photo"

        linkedin = officer.get("linkedin", "")
        link = ""
        if name != "Vacant" and valid_external_url(linkedin):
            host = urlsplit(linkedin).hostname or ""
            if host == "linkedin.com" or host.endswith(".linkedin.com"):
                link = f'<a class="officer-social" href="{html.escape(linkedin, quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="Visit {html.escape(name, quote=True)}’s LinkedIn profile">LinkedIn ↗</a>'
        cards.append(
            f'<article class="{card_class}">{image}<small class="officer-role">{html.escape(role)}</small>'
            f'<strong>{html.escape(name)}</strong>{link}</article>'
        )
    return "\n".join(cards)


def render_volunteer_updates(events: list[dict]) -> str:
    if not events:
        return '<p class="timeline-empty">No volunteer dates announced yet.</p>'

    def parsed_date(event: dict) -> calendar_date | None:
        value = event.get("date")
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return None
        try:
            return calendar_date.fromisoformat(value)
        except ValueError:
            return None

    def order(event: dict) -> tuple[int, int, str]:
        parsed = parsed_date(event)
        status = str(event.get("status", "")).strip().lower()
        if parsed is None:
            return (2, 0, str(event.get("name", "")))
        if status in {"canceled", "cancelled", "completed"}:
            return (1, -parsed.toordinal(), str(event.get("name", "")))
        return (0, parsed.toordinal(), str(event.get("name", "")))

    for event in events:
        if not isinstance(event, dict):
            raise ValueError("Each data/volunteering.js entry must be an object")
    events = sorted(events, key=order)
    items: list[str] = []
    for event in events:
        name = str(event.get("name", "Volunteer event")).strip() or "Volunteer event"
        date = parsed_date(event)
        date_label = "Date to be announced"
        if date:
            date_label = date.strftime("%b %d, %Y").replace(" 0", " ")
        note = str(event.get("note", "")).strip()
        if not note:
            note = "Email the club for current participation details."
        status = str(event.get("status", "")).strip().lower()
        permanent_status = "Canceled" if status in {"canceled", "cancelled"} else "Completed" if status == "completed" else ""
        status_html = f'<span class="timeline-status">{permanent_status}</span>' if permanent_status else ""
        items.append(
            '<article class="timeline-item"><div class="timeline-top">'
            f'<small>{html.escape(date_label)}</small>{status_html}</div>'
            f'<h3>{html.escape(name)}</h3><p>{html.escape(note)}</p></article>'
        )
    return "\n".join(items)


def render_event_fallback(events: list[dict]) -> str:
    if not events:
        return '<p class="event-static-note">No activity dates are posted.</p>'

    def event_date(event: dict) -> calendar_date | None:
        value = event.get("date")
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return None
        try:
            return calendar_date.fromisoformat(value)
        except ValueError:
            return None

    valid_events = [event for event in events if isinstance(event, dict)]
    valid_events.sort(key=lambda event: ((event_date(event) or calendar_date.min), str(event.get("startTime", ""))), reverse=True)
    items: list[str] = []
    for event in valid_events:
        date = event_date(event)
        title = str(event.get("title", "Activity")).strip() or "Activity"
        if date:
            date_label = date.strftime("%b %d, %Y").replace(" 0", " ")
            date_markup = f'<time datetime="{date.isoformat()}">{date_label}</time>'
        else:
            date_markup = '<span>Date to be announced</span>'
        start_time = event.get("startTime")
        time_label = ""
        if isinstance(start_time, str) and re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", start_time):
            time_label = f' · {display_time(start_time)}'
        items.append(f'<li>{date_markup}{time_label} — {html.escape(title)}</li>')
    return (
        '<p class="event-static-note">Published activity dates are listed below. Check the date before attending.</p>'
        '<ul class="event-static-list">'
        + "".join(items)
        + "</ul>"
    )


def render_schedule_notice(meeting: dict) -> str:
    notice = meeting.get("scheduleNotice", "")
    if not isinstance(notice, str):
        raise ValueError("data/club.json meeting.scheduleNotice must be a string")
    if not notice.strip():
        return ""
    return f'<p class="schedule-change-notice" role="status">{html.escape(notice.strip())}</p>'


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
    if "scheduleNotice" in meeting and not isinstance(meeting["scheduleNotice"], str):
        raise ValueError("data/club.json meeting.scheduleNotice must be a string")
    time_pattern = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    if not time_pattern.fullmatch(meeting["startTime"]) or not time_pattern.fullmatch(meeting["endTime"]):
        raise ValueError("Meeting startTime and endTime must use 24-hour HH:MM format")
    try:
        ZoneInfo(meeting["timeZone"])
    except ZoneInfoNotFoundError as error:
        raise ValueError(f"Unknown meeting time zone: {meeting['timeZone']}") from error


def render_page(filename: str, current_page: str, config: dict, site: dict, officers: list[dict]) -> str:
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
    html_text = fill_site_links(html_text, site)
    if filename in {"index.html", "meetings.html"}:
        html_text = replace_marked(html_text, SCHEDULE_NOTICE_MARKERS, render_schedule_notice(config["meeting"]))
        event_data = read_assigned_json(ROOT / "data" / "events.js", "SCIOLY_EVENTS", "[", "]")
        if not isinstance(event_data, list):
            raise ValueError("data/events.js must contain an array")
        html_text = replace_marked(html_text, EVENT_FALLBACK_MARKERS, render_event_fallback(event_data))
    if filename == "about.html":
        html_text = replace_marked(html_text, OFFICER_MARKERS, render_officers(officers))
    if filename == "volunteer.html":
        volunteering = read_assigned_json(ROOT / "data" / "volunteering.js", "SCIOLY_VOLUNTEERING", "[", "]")
        if not isinstance(volunteering, list):
            raise ValueError("data/volunteering.js must contain an array")
        html_text = replace_marked(html_text, VOLUNTEER_MARKERS, render_volunteer_updates(volunteering))
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
        site = read_assigned_json(SITE_SOURCE, "SCIOLY_SITE", "{", "}")
        officers = read_assigned_json(OFFICERS_SOURCE, "SCIOLY_OFFICERS", "[", "]")
        if not isinstance(site, dict) or not isinstance(officers, list):
            raise ValueError("data/site.js must contain an object and data/officers.js an array")
        for filename, current_page in PAGES.items():
            expected = render_page(filename, current_page, config, site, officers)
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
