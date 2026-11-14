/**
 * Asia/Jerusalem timezone-safe availability & working hours computation.
 * Handles both "HH:MM" strings and legacy numeric hours (e.g. 12 -> 12:00),
 * DST transitions, duration-aware appointment overlaps, and explicit empty-state reasons.
 */

export const STUDIO_TIMEZONE = 'Asia/Jerusalem';
export const DEFAULT_BOOKING_HORIZON_DAYS = 30;
export const DEFAULT_SLOT_STEP_MINUTES = 30;
export const DEFAULT_SAME_DAY_LEAD_MINUTES = 15;

export interface AvailabilityTimeRange {
  start: string | number;
  end: string | number;
}

export interface AvailabilityDaySchedule {
  isOpen: boolean;
  ranges: AvailabilityTimeRange[];
}

export type WorkingHoursMap = Record<string, AvailabilityDaySchedule>;

export interface SlotItem {
  time: string;
  available: boolean;
  reason?: 'booked' | 'past' | 'insufficient_duration';
  startIso?: string;
}

export type DayAvailabilityStatus =
  | 'open'
  | 'closed_day'
  | 'fully_booked'
  | 'outside_horizon'
  | 'studio_all_closed'
  | 'error';

export interface DayAvailabilityResult {
  date: string; // YYYY-MM-DD in Asia/Jerusalem
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  status: DayAvailabilityStatus;
  reasonMessage: string;
  horizonDays: number;
  maxBookableDate: string;
  slots: SlotItem[];
  serviceDurationMinutes: number;
}

export interface CalendarDayMeta {
  dateKey: string;
  dayOfWeek: number;
  isWithinHorizon: boolean;
  isOpenSchedule: boolean;
  labelShort: string;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Parses either a number (e.g. 12 or 12.5 or 20) or "HH:MM" / "HH" string into minutes since midnight.
 */
export function parseTimeEndpointToMinutes(val: unknown): number | null {
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val < 0 || val > 24) return null;
    const hours = Math.floor(val);
    const mins = Math.round((val - hours) * 60);
    const total = hours * 60 + mins;
    return total >= 0 && total <= 1440 ? total : null;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d{1,2}$/.test(trimmed)) {
      const h = Number.parseInt(trimmed, 10);
      if (h < 0 || h > 24) return null;
      return h * 60;
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = Number.parseInt(match[1], 10);
    const m = Number.parseInt(match[2], 10);
    if (h < 0 || h > 24 || m < 0 || m > 59 || (h === 24 && m > 0)) return null;
    return h * 60 + m;
  }

  return null;
}

export function formatMinutesToHHMM(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(clamped / 60).toString().padStart(2, '0');
  const m = (clamped % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function normalizeWorkingHoursRangeEndpoint(val: unknown): string {
  const mins = parseTimeEndpointToMinutes(val);
  if (mins === null) return '09:00';
  if (mins === 1440) return '23:59';
  return formatMinutesToHHMM(mins);
}

/**
 * Extracts YYYY-MM-DD, weekday (0..6), and minutes from midnight in Asia/Jerusalem for a Date.
 */
export function getJerusalemParts(date: Date): {
  dateKey: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  minutesSinceMidnight: number;
} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const year = Number.parseInt(get('year'), 10);
  const month = Number.parseInt(get('month'), 10);
  const day = Number.parseInt(get('day'), 10);
  const hour = Number.parseInt(get('hour'), 10) % 24;
  const minute = Number.parseInt(get('minute'), 10);
  const weekdayStr = get('weekday');
  const dayOfWeek = WEEKDAY_MAP[weekdayStr] ?? 0;

  return {
    dateKey: `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    year,
    month,
    day,
    dayOfWeek,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const y = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  const d = Number.parseInt(match[3], 10);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

export function getDayOfWeekForDateKey(dateKey: string): number {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  const y = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  const d = Number.parseInt(match[3], 10);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

/**
 * Converts a local dateKey ("YYYY-MM-DD") and minutes since midnight in Asia/Jerusalem
 * into an exact UTC Date instant (accurate across IST/IDT DST transitions).
 */
export function jerusalemLocalToUtcDate(dateKey: string, minutesFromMidnight: number): Date {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid dateKey: ${dateKey}`);
  }
  const y = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  const d = Number.parseInt(match[3], 10);
  const targetUtcAsNaive = Date.UTC(y, m - 1, d, 0, minutesFromMidnight, 0, 0);

  // Two-pass fixed-point offset resolution guarantees accuracy right across DST transitions
  let candidateMs = targetUtcAsNaive - 2 * 3600 * 1000;
  for (let i = 0; i < 3; i++) {
    const p = getJerusalemParts(new Date(candidateMs));
    const [py, pm, pd] = p.dateKey.split('-').map(n => Number.parseInt(n, 10));
    const observedNaiveMs = Date.UTC(py, pm - 1, pd, 0, p.minutesSinceMidnight, 0, 0);
    const diff = targetUtcAsNaive - observedNaiveMs;
    if (diff === 0) break;
    candidateMs += diff;
  }

  return new Date(candidateMs);
}

export function isStudioCompletelyClosed(workingHours: WorkingHoursMap | null | undefined): boolean {
  if (!workingHours || typeof workingHours !== 'object') return true;
  for (let d = 0; d < 7; d++) {
    const cfg = workingHours[d.toString()];
    if (cfg && cfg.isOpen && Array.isArray(cfg.ranges) && cfg.ranges.length > 0) {
      const hasValidRange = cfg.ranges.some(r => {
        const s = parseTimeEndpointToMinutes(r?.start);
        const e = parseTimeEndpointToMinutes(r?.end);
        return s !== null && e !== null && e > s;
      });
      if (hasValidRange) return false;
    }
  }
  return true;
}

export function normalizeHorizonDays(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_BOOKING_HORIZON_DAYS;
  return Math.min(180, Math.max(1, Math.floor(n)));
}

export interface AppointmentInterval {
  start_time: string | Date;
  end_time?: string | Date | null;
  status?: string;
}

export function computeDayAvailability(options: {
  dateKey: string;
  workingHours: WorkingHoursMap | null | undefined;
  existingAppointments: AppointmentInterval[];
  serviceDurationMinutes?: number;
  horizonDays?: number;
  slotStepMinutes?: number;
  sameDayLeadMinutes?: number;
  now?: Date;
}): DayAvailabilityResult {
  const now = options.now || new Date();
  const todayParts = getJerusalemParts(now);
  const horizonDays = normalizeHorizonDays(options.horizonDays);
  const maxBookableDate = addDaysToDateKey(todayParts.dateKey, horizonDays);
  const duration = Math.max(
    15,
    Math.min(480, Math.round(options.serviceDurationMinutes || DEFAULT_SLOT_STEP_MINUTES))
  );
  const step = Math.max(15, Math.min(60, Math.round(options.slotStepMinutes || DEFAULT_SLOT_STEP_MINUTES)));
  const leadMinutes = options.sameDayLeadMinutes ?? DEFAULT_SAME_DAY_LEAD_MINUTES;
  const dayOfWeek = getDayOfWeekForDateKey(options.dateKey);

  // Validate date format & horizon
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.dateKey)) {
    return {
      date: options.dateKey,
      dayOfWeek,
      status: 'error',
      reasonMessage: 'תאריך לא תקין',
      horizonDays,
      maxBookableDate,
      slots: [],
      serviceDurationMinutes: duration,
    };
  }

  if (options.dateKey < todayParts.dateKey || options.dateKey > maxBookableDate) {
    return {
      date: options.dateKey,
      dayOfWeek,
      status: 'outside_horizon',
      reasonMessage:
        options.dateKey < todayParts.dateKey
          ? 'לא ניתן להזמין תור לתאריך שכבר עבר.'
          : `ניתן לתאם תורים עד ${horizonDays} ימים קדימה בלבד.`,
      horizonDays,
      maxBookableDate,
      slots: [],
      serviceDurationMinutes: duration,
    };
  }

  if (isStudioCompletelyClosed(options.workingHours)) {
    return {
      date: options.dateKey,
      dayOfWeek,
      status: 'studio_all_closed',
      reasonMessage: 'יומן התורים אינו פתוח להזמנה אונליין כרגע. ניתן לפנות ישירות בווטסאפ לתיאום מועד.',
      horizonDays,
      maxBookableDate,
      slots: [],
      serviceDurationMinutes: duration,
    };
  }

  const dayConfig = options.workingHours?.[dayOfWeek.toString()];
  if (!dayConfig || !dayConfig.isOpen || !Array.isArray(dayConfig.ranges) || dayConfig.ranges.length === 0) {
    return {
      date: options.dateKey,
      dayOfWeek,
      status: 'closed_day',
      reasonMessage: 'הסטודיו סגור ביום זה.',
      horizonDays,
      maxBookableDate,
      slots: [],
      serviceDurationMinutes: duration,
    };
  }

  // Build normalized non-cancelled busy intervals in UTC ms
  const busyIntervals = (options.existingAppointments || [])
    .filter(a => a && a.status !== 'cancelled')
    .map(a => {
      const startMs = new Date(a.start_time).getTime();
      let endMs = a.end_time ? new Date(a.end_time).getTime() : NaN;
      if (!Number.isFinite(endMs) || endMs <= startMs) {
        endMs = startMs + 30 * 60000;
      }
      return { startMs, endMs };
    })
    .filter(b => Number.isFinite(b.startMs) && Number.isFinite(b.endMs));

  const seenTimes = new Set<string>();
  const slots: SlotItem[] = [];
  const cutoffMs = now.getTime() + leadMinutes * 60000;

  for (const range of dayConfig.ranges) {
    const startMin = parseTimeEndpointToMinutes(range?.start);
    const endMin = parseTimeEndpointToMinutes(range?.end);
    if (startMin === null || endMin === null || endMin <= startMin) continue;

    for (let t = startMin; t + duration <= endMin; t += step) {
      const timeLabel = formatMinutesToHHMM(t);
      if (seenTimes.has(timeLabel)) continue;
      seenTimes.add(timeLabel);

      const slotStartDate = jerusalemLocalToUtcDate(options.dateKey, t);
      const slotStartMs = slotStartDate.getTime();
      const slotEndMs = slotStartMs + duration * 60000;

      if (slotStartMs < cutoffMs) {
        slots.push({
          time: timeLabel,
          available: false,
          reason: 'past',
          startIso: slotStartDate.toISOString(),
        });
        continue;
      }

      const overlaps = busyIntervals.some(
        b => slotStartMs < b.endMs && slotEndMs > b.startMs
      );

      slots.push({
        time: timeLabel,
        available: !overlaps,
        reason: overlaps ? 'booked' : undefined,
        startIso: slotStartDate.toISOString(),
      });
    }
  }

  slots.sort((a, b) => a.time.localeCompare(b.time));
  const openCount = slots.filter(s => s.available).length;

  if (slots.length === 0) {
    return {
      date: options.dateKey,
      dayOfWeek,
      status: 'closed_day',
      reasonMessage: 'אין שעות פעילות מתאימות למשך השירות שנבחר ביום זה.',
      horizonDays,
      maxBookableDate,
      slots: [],
      serviceDurationMinutes: duration,
    };
  }

  if (openCount === 0) {
    return {
      date: options.dateKey,
      dayOfWeek,
      status: 'fully_booked',
      reasonMessage: 'כל התורים לתאריך זה תפוסים או שכבר חלפו.',
      horizonDays,
      maxBookableDate,
      slots,
      serviceDurationMinutes: duration,
    };
  }

  return {
    date: options.dateKey,
    dayOfWeek,
    status: 'open',
    reasonMessage: '',
    horizonDays,
    maxBookableDate,
    slots,
    serviceDurationMinutes: duration,
  };
}

export function buildBookingHorizonDays(options: {
  workingHours: WorkingHoursMap | null | undefined;
  horizonDays?: number;
  now?: Date;
}): CalendarDayMeta[] {
  const now = options.now || new Date();
  const todayParts = getJerusalemParts(now);
  const horizonDays = normalizeHorizonDays(options.horizonDays);
  const result: CalendarDayMeta[] = [];

  for (let i = 0; i <= horizonDays; i++) {
    const dateKey = addDaysToDateKey(todayParts.dateKey, i);
    const dayOfWeek = getDayOfWeekForDateKey(dateKey);
    const dayCfg = options.workingHours?.[dayOfWeek.toString()];
    const hasRanges =
      Boolean(dayCfg?.isOpen) &&
      Array.isArray(dayCfg?.ranges) &&
      dayCfg!.ranges.some(r => {
        const s = parseTimeEndpointToMinutes(r?.start);
        const e = parseTimeEndpointToMinutes(r?.end);
        return s !== null && e !== null && e > s;
      });

    result.push({
      dateKey,
      dayOfWeek,
      isWithinHorizon: true,
      isOpenSchedule: hasRanges,
      labelShort: dateKey,
    });
  }

  return result;
}
