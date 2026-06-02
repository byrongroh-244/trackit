export type AssignmentType   = 'homework' | 'test' | 'quiz' | 'project' | 'task' | 'other'
export type AssignmentEffort = 'quick' | 'medium' | 'long' | null

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
}

export interface Assignment {
  id: string;
  name: string;
  classId: string;
  className: string;
  classColor: string;
  dueDate: string;
  done: boolean;
  notes: string;
  subtasks: Subtask[];
  type: AssignmentType;
  effort: AssignmentEffort;
  weight?: number;              // percentage of total grade (0-100)
  communications?: CommunicationLog[];
}

export interface Course {
  id: string;
  name: string;
  color: string;
  description?: string;
  teacherName?: string;
  canvasName?: string;  // original Canvas name, used for sync dedup
}

export type UrgencyConfig = {
  accent: string;
  bg: string;
  text: string;
  label: string;
};

export type Section = 'needs_attention' | 'coming_up' | 'on_track';

export type Screen =
  | 'today'
  | 'add'
  | 'classes'
  | 'detail'
  | 'canvas'
  | 'settings'
  | 'calendar'
  | 'onboarding';

// ── Deadline Recovery System ──────────────────────────────────────────────────

export type CommunicationStatus =
  | 'sent_waiting'
  | 'teacher_yes'
  | 'teacher_no'
  | 'teacher_partial'
  | 'no_response';

export interface CommunicationLog {
  id: string;
  date: string;                  // YYYY-MM-DD
  tier: 1 | 2 | 3 | 4;
  type: 'email' | 'in_person' | 'other';
  status: CommunicationStatus;
  newDeadline: string | null;    // YYYY-MM-DD if teacher said yes
  notes: string;
}
