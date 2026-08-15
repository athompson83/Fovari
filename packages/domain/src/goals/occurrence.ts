import type { GoalOccurrence } from "./types";

export interface GenerateDailyOccurrencesInput {
  assignmentId: string;
  childId: string;
  pointValue: number;
  startDate: string;
  weekdays?: readonly number[];
  windowDays: number;
}

const isoCalendarDate = /^\d{4}-\d{2}-\d{2}$/;

function parseCalendarDate(value: string): Date {
  if (!isoCalendarDate.test(value)) {
    throw new Error("startDate must be a valid ISO calendar date");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("startDate must be a valid ISO calendar date");
  }

  return parsed;
}

export function generateDailyOccurrences(input: GenerateDailyOccurrencesInput): GoalOccurrence[] {
  const start = parseCalendarDate(input.startDate);

  if (!Number.isSafeInteger(input.pointValue) || input.pointValue < 0) {
    throw new Error("pointValue must be a non-negative safe integer");
  }

  if (!Number.isSafeInteger(input.windowDays) || input.windowDays < 1 || input.windowDays > 366) {
    throw new Error("windowDays must be between 1 and 366");
  }

  const weekdays = new Set(input.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  if ([...weekdays].some((day) => !Number.isSafeInteger(day) || day < 0 || day > 6)) {
    throw new Error("weekdays must contain values from 0 through 6");
  }

  const occurrences: GoalOccurrence[] = [];

  for (let offset = 0; offset < input.windowDays; offset += 1) {
    const scheduledDate = new Date(start);
    scheduledDate.setUTCDate(start.getUTCDate() + offset);

    if (!weekdays.has(scheduledDate.getUTCDay())) {
      continue;
    }

    const scheduledFor = scheduledDate.toISOString().slice(0, 10);
    occurrences.push({
      assignmentId: input.assignmentId,
      childId: input.childId,
      idempotencyKey: `${input.assignmentId}:${scheduledFor}`,
      pointValue: input.pointValue,
      scheduledFor,
      status: "scheduled",
    });
  }

  return occurrences;
}
