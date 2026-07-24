export type OccurrenceStatus =
  | "scheduled"
  | "available"
  | "submitted"
  | "approved"
  | "rejected"
  | "skipped"
  | "excused"
  | "expired"
  | "cancelled";

export interface GoalOccurrence {
  assignmentId: string;
  childId: string;
  idempotencyKey: string;
  pointValue: number;
  scheduledFor: string;
  status: OccurrenceStatus;
}
