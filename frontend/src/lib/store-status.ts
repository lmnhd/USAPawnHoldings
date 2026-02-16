const EASTERN_TIMEZONE = "America/New_York";

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Weekday = (typeof WEEKDAY_ORDER)[number];

type StoreHoursMap = Record<string, string>;

type ParsedSchedule = {
  openMinutes: number;
  closeMinutes: number;
  openLabel: string;
  closeLabel: string;
};

function parseTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hourRaw = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (!Number.isFinite(hourRaw) || !Number.isFinite(minute) || hourRaw < 1 || hourRaw > 12 || minute < 0 || minute > 59) {
    return null;
  }

  const hour24 = (hourRaw % 12) + (period === "PM" ? 12 : 0);
  return hour24 * 60 + minute;
}

function parseSchedule(schedule: string): ParsedSchedule | null {
  const match = schedule.trim().match(/^(.+?)\s*-\s*(.+)$/);
  if (!match) return null;

  const openLabel = match[1].trim();
  const closeLabel = match[2].trim();
  const openMinutes = parseTimeToMinutes(openLabel);
  const closeMinutes = parseTimeToMinutes(closeLabel);

  if (openMinutes == null || closeMinutes == null) {
    return null;
  }

  return { openMinutes, closeMinutes, openLabel, closeLabel };
}

function getEasternNowParts(referenceDate?: Date): { weekday: Weekday; minutes: number; formattedNow: string } {
  const now = referenceDate ?? new Date();

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: EASTERN_TIMEZONE,
  })
    .format(now)
    .toLowerCase() as Weekday;

  const timeParts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: EASTERN_TIMEZONE,
  }).formatToParts(now);

  const hourRaw = Number(timeParts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(timeParts.find((part) => part.type === "minute")?.value ?? "0");
  const dayPeriod = (timeParts.find((part) => part.type === "dayPeriod")?.value ?? "AM").toUpperCase();

  const hour24 = (hourRaw % 12) + (dayPeriod === "PM" ? 12 : 0);
  const minutes = hour24 * 60 + minute;

  const formattedNow = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: EASTERN_TIMEZONE,
  }).format(now);

  return { weekday, minutes, formattedNow };
}

function getNextOpening(hours: StoreHoursMap, currentDayIndex: number): { day: string; openLabel: string } | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = WEEKDAY_ORDER[(currentDayIndex + offset) % 7];
    const schedule = hours[day] ?? "Closed";
    const parsed = parseSchedule(schedule);
    if (parsed) {
      const dayLabel = `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
      return { day: dayLabel, openLabel: parsed.openLabel };
    }
  }

  return null;
}

export function getStoreStatusInEastern(hours: StoreHoursMap, referenceDate?: Date) {
  const { weekday, minutes: currentMinutes, formattedNow } = getEasternNowParts(referenceDate);
  const dayIndex = WEEKDAY_ORDER.indexOf(weekday);
  const todaySchedule = hours[weekday] ?? "Closed";
  const parsedToday = parseSchedule(todaySchedule);

  if (!parsedToday) {
    const next = getNextOpening(hours, dayIndex);
    return {
      open: false,
      timezone: EASTERN_TIMEZONE,
      weekday,
      now_label: `${formattedNow} ET`,
      today_schedule: todaySchedule,
      message: next
        ? `We are currently closed. We reopen ${next.day} at ${next.openLabel} ET.`
        : "We are currently closed.",
    };
  }

  if (currentMinutes >= parsedToday.openMinutes && currentMinutes <= parsedToday.closeMinutes) {
    return {
      open: true,
      timezone: EASTERN_TIMEZONE,
      weekday,
      now_label: `${formattedNow} ET`,
      today_schedule: todaySchedule,
      message: `We are open now until ${parsedToday.closeLabel} ET.`,
    };
  }

  if (currentMinutes < parsedToday.openMinutes) {
    return {
      open: false,
      timezone: EASTERN_TIMEZONE,
      weekday,
      now_label: `${formattedNow} ET`,
      today_schedule: todaySchedule,
      message: `We are currently closed and open today at ${parsedToday.openLabel} ET.`,
    };
  }

  const next = getNextOpening(hours, dayIndex);
  return {
    open: false,
    timezone: EASTERN_TIMEZONE,
    weekday,
    now_label: `${formattedNow} ET`,
    today_schedule: todaySchedule,
    message: next
      ? `We are currently closed. We reopen ${next.day} at ${next.openLabel} ET.`
      : "We are currently closed.",
  };
}
