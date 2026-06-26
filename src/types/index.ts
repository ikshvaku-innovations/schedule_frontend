export interface User {
  id: string;
  name: string;
  email: string; // maps to email_id in users_login table
  org_id: string | null;
  department: string | null;
  course: string | null;
  division: string | null;
  prn: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  position_name: string;
  duration: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  completed: boolean;
  jd_summary: string | null;
  is_hr_interview: boolean;
  has_video_insights: boolean;
  no_of_questions: string | null;
  viva_id: string | null;
}

export interface Schedule {
  id: string;
  job_id: string;
  user_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  job_id: string;
  user_id: string;
  has_video_insights: boolean;
}

export interface Report {
  id: string;
  job_id: string;
  score: number;
  overall_score: number | null;
}

export interface EvalCriteria {
  id: string;
  job_id: string;
  criterion_text: string;
  category: string | null;
  order_index: number;
}

export interface EvalScore {
  id: string;
  job_id: string;
  criterion_id: string;
  score: number;
  justification: string;
}

export interface ExecutiveAnalysis {
  id: string;
  job_id: string;
  executive_summary: string;
  hiring_decision: 'selected' | 'selected_for_next_round' | 'not_selected';
  key_strengths: string[];
  areas_of_concern: string[];
  recommendation: string | null;
}

export interface SessionWindow {
  id: string;
  position_name: string;
  start_datetime: string;
  end_datetime: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'completed' | 'active' | 'expired' | 'scheduled' | 'not_scheduled';

export interface JobWithSchedule extends Job {
  schedule: Schedule | null;
  status: JobStatus;
  session_id: string | null;
  viva_end_date_and_time?: string | null;
}

