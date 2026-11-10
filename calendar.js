
/*
 * SBU SciOly — Add to Calendar
 * Google Calendar and downloadable .ics events.
 * Meeting times use the time zone passed from data/club.json.
 */

(function () {
  "use strict";

  const SITE_URL = "https://sbuscioly.club/";
  const TARGET_ID = "gbm-calendar-actions";
  const zoneFormatters = new Map();

  function zonedParts(instant, timeZone) {
    if (!zoneFormatters.has(timeZone)) {
      zoneFormatters.set(timeZone, new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }));
    }
    return Object.fromEntries(
      zoneFormatters.get(timeZone).formatToParts(new Date(instant))
        .filter(part => part.type !== "literal")
        .map(part => [part.type, Number(part.value)])
    );
  }

  function parseTime(value) {
    if (typeof value !== "string") return null;

    // Accepts 19:00, 7:00 PM, 7 PM, etc.
    const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i
      .exec(value.trim());

    if (!match || (!match[2] && !match[3])) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);

    if (minute > 59) return null;

    if (match[3]) {
      if (hour < 1 || hour > 12) return null;
      hour = (hour % 12) +
        (match[3].toLowerCase() === "pm" ? 12 : 0);
    } else if (hour > 23) {
      return null;
    }

    return { hour, minute };
  }

  function localDateToUTC(dateText, timeText, timeZone) {
    if (typeof dateText !== "string") return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(dateText.trim());

    const time = parseTime(timeText);

    if (!match || !time) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const naive = Date.UTC(
      year, month - 1, day, time.hour, time.minute
    );

    const check = new Date(naive);

    // Reject invalid dates, such as February 30.
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) {
      return null;
    }

    // Determine possible offsets in the event's local time zone around the date.
    const offsets = new Set();

    for (const shift of [-36, -12, 0, 12, 36]) {
      const sample = naive + shift * 3600000;
      const p = zonedParts(sample, timeZone);

      const asUTC = Date.UTC(
        p.year, p.month - 1, p.day, p.hour, p.minute
      );

      offsets.add(Math.round((asUTC - sample) / 60000));
    }

    const matches = [...offsets]
      .map(offset => naive - offset * 60000)
      .filter(instant => {
        const p = zonedParts(instant, timeZone);

        return (
          p.year === year &&
          p.month === month &&
          p.day === day &&
          p.hour === time.hour &&
          p.minute === time.minute
        );
      });

    // Never guess during ambiguous or nonexistent daylight-saving times.
    return matches.length === 1
      ? new Date(matches[0])
      : null;
  }

  function normalizeEvent(event) {
    if (!event || typeof event !== "object") return null;

    const status = String(event.status || "")
      .trim().toLowerCase();

    if (
      event.cancelled === true ||
      event.confirmed === false ||
      event.isConfirmed === false ||
      event.calendarEnabled === false ||
      [
        "cancelled", "canceled", "postponed",
        "tentative", "draft", "planned",
        "proposed", "unconfirmed", "tba"
      ].includes(status)
    ) {
      return null;
    }

    const calendar =
      event.calendar && typeof event.calendar === "object"
        ? event.calendar
        : event;
    const timeZone = calendar.timeZone ?? event.timeZone;

    const title = String(event.title ?? event.name ?? "").trim();

    const date = calendar.date ?? event.date ?? event.dateISO;
    const startText =
      calendar.startTime ?? calendar.start ?? calendar.timeStart;
    const endText =
      calendar.endTime ?? calendar.end ?? calendar.timeEnd;

    if (typeof timeZone !== "string" || !timeZone.trim()) return null;

    const start = localDateToUTC(date, startText, timeZone);
    const end = localDateToUTC(
      calendar.endDate ?? date,
      endText,
      timeZone
    );

    if (
      !title ||
      !start ||
      !end ||
      end <= start ||
      end.getTime() <= Date.now()
    ) {
      return null;
    }

    const location =
      typeof event.location === "string"
        ? event.location.trim()
        : typeof calendar.location === "string"
          ? calendar.location.trim()
          : "";

    const id = String(
      event.id ?? event.slug ?? `${date}-${title}`
    )
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100);

    return { title, start, end, location, id, timeZone };
  }

  function utcStamp(date) {
    return date.toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  function googleCalendarURL(event) {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `SBU SciOly: ${event.title}`,
      dates: (
        `${utcStamp(event.start)}/${utcStamp(event.end)}`
      ),
      ctz: event.timeZone,
      details: (
        `SBU Science Olympiad GBM. ` +
        `Check ${SITE_URL} for updates.`
      )
    });

    if (event.location) {
      params.set("location", event.location);
    }

    return (
      "https://calendar.google.com/calendar/render?" +
      params.toString()
    );
  }

  function escapeICS(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\r|\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  // iCalendar lines must not exceed 75 UTF-8 octets.
  function foldICS(line) {
    const encoder = new TextEncoder();
    let output = "";
    let bytes = 0;

    for (const char of line) {
      const length = encoder.encode(char).length;

      if (bytes + length > 75) {
        output += "\r\n ";
        bytes = 1;
      }

      output += char;
      bytes += length;
    }

    return output;
  }

  function createICS(event) {
    const description =
      `SBU Science Olympiad GBM. ` +
      `Check ${SITE_URL} for updates.`;

    const uid =
      `gbm-${event.id}-` +
      `${event.start.toISOString().slice(0, 10)}` +
      "@sbuscioly.club";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SBU SciOly//GBM Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${escapeICS(uid)}`,
      `DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART:${utcStamp(event.start)}`,
      `DTEND:${utcStamp(event.end)}`,
      `SUMMARY:${escapeICS(`SBU SciOly: ${event.title}`)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      ...(event.location
        ? [`LOCATION:${escapeICS(event.location)}`]
        : []),
      `URL:${SITE_URL}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ];

    return lines.map(foldICS).join("\r\n") + "\r\n";
  }

  function downloadICS(event) {
    const blob = new Blob([createICS(event)], {
      type: "text/calendar;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `sbu-scioly-${event.start.toISOString().slice(0, 10)}.ics`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function render(event, targetId = TARGET_ID) {
    const target = document.getElementById(targetId);

    if (!target) {
      console.warn(`Calendar placeholder #${targetId} not found.`);
      return;
    }

    // Prevent duplicate buttons when a meeting changes.
    target.replaceChildren();

    const item = normalizeEvent(event);

    // Do not create events from incomplete information.
    if (!item) return;

    const label = document.createElement("span");
    label.className = "calendar-label";
    label.textContent = "Save this meeting:";

    const google = document.createElement("a");
    google.className = "calendar-link";
    google.href = googleCalendarURL(item);
    google.target = "_blank";
    google.rel = "noopener noreferrer";
    google.textContent = "Google Calendar";

    google.setAttribute(
      "aria-label",
      `Add ${item.title} to Google Calendar (opens a new tab)`
    );

    const download = document.createElement("button");
    download.className = "calendar-link";
    download.type = "button";
    download.textContent = "Download .ics";

    download.setAttribute(
      "aria-label",
      `Download calendar event for ${item.title}`
    );

    download.addEventListener("click", () => {
      downloadICS(item);
    });

    const note = document.createElement("small");
    note.className = "calendar-note";
    note.textContent =
      `${item.timeZone}. Saved events don't update automatically ` +
      "if plans change.";

    target.append(label, google, download, note);
  }

  window.SBUCalendar = Object.freeze({ render });
})();
