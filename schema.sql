-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  resume_summary text,
  MaxConsumption integer NOT NULL DEFAULT 3,
  ActualConsumption integer NOT NULL DEFAULT 0,
  plan text NOT NULL DEFAULT 'starter'::text CHECK (plan = ANY (ARRAY['starter'::text, 'pro'::text, 'elite'::text])),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_name character varying NOT NULL,
  duration integer NOT NULL,
  level character varying NOT NULL CHECK (level::text = ANY (ARRAY['Beginner'::character varying, 'Intermediate'::character varying, 'Advanced'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_deleted boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  jd_summary text,
  is_hr_interview boolean NOT NULL DEFAULT false,
  has_video_insights boolean NOT NULL DEFAULT false,
  no_of_questions text,
  viva_id uuid,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT jobs_viva_id_fkey FOREIGN KEY (viva_id) REFERENCES public.vivas(id) ON DELETE CASCADE
);

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  overall_score numeric,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid DEFAULT gen_random_uuid(),
  question_number text,
  question text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT gen_random_uuid(),
  has_video_insights boolean NOT NULL DEFAULT true,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.eval_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  criterion_text text NOT NULL,
  category character varying,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT eval_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT eval_criteria_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.transcript (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid,
  transcript text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transcript_pkey PRIMARY KEY (id),
  CONSTRAINT transcript_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT transcript_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.eval_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  criterion_id uuid NOT NULL,
  score numeric NOT NULL CHECK (score >= 0::numeric AND score <= 100::numeric),
  justification text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT eval_scores_pkey PRIMARY KEY (id),
  CONSTRAINT eval_scores_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT eval_scores_criterion_id_fkey FOREIGN KEY (criterion_id) REFERENCES public.eval_criteria(id)
);

CREATE TABLE public.report_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  insight_type text NOT NULL CHECK (insight_type = ANY (ARRAY['strength'::text, 'weakness'::text, 'recommendation'::text])),
  content text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT report_insights_pkey PRIMARY KEY (id),
  CONSTRAINT report_insights_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.executive_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE,
  executive_summary text NOT NULL,
  hiring_decision text NOT NULL CHECK (hiring_decision = ANY (ARRAY['selected'::text, 'selected_for_next_round'::text, 'not_selected'::text])),
  key_strengths ARRAY,
  areas_of_concern ARRAY,
  recommendation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT executive_analysis_pkey PRIMARY KEY (id),
  CONSTRAINT executive_analysis_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.deep_dive_qa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  question_number integer NOT NULL,
  ai_question text NOT NULL,
  user_answer_summary text NOT NULL,
  analysis text NOT NULL,
  improvements ARRAY,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deep_dive_qa_pkey PRIMARY KEY (id),
  CONSTRAINT deep_dive_qa_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.video_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  video_url text NOT NULL,
  video_duration_seconds integer,
  overall_summary text NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0::numeric AND confidence_score <= 100::numeric),
  body_language jsonb NOT NULL DEFAULT '{}'::jsonb,
  facial_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  vocal_delivery jsonb NOT NULL DEFAULT '{}'::jsonb,
  communication_quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  professional_presence jsonb NOT NULL DEFAULT '{}'::jsonb,
  engagement_level jsonb NOT NULL DEFAULT '{}'::jsonb,
  stress_indicators jsonb NOT NULL DEFAULT '{}'::jsonb,
  authenticity_indicators jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamped_insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  processing_status text NOT NULL DEFAULT 'completed'::text CHECK (processing_status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT video_insights_pkey PRIMARY KEY (id),
  CONSTRAINT video_insights_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.email_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_otps_pkey PRIMARY KEY (id)
);

CREATE TABLE public.resume_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_name text NOT NULL,
  overall_match_score numeric CHECK (overall_match_score >= 0::numeric AND overall_match_score <= 100::numeric),
  fit_summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  jd_text text,
  CONSTRAINT resume_analyses_pkey PRIMARY KEY (id),
  CONSTRAINT resume_analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.resume_jd_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  metric_name text NOT NULL,
  score numeric CHECK (score >= 0::numeric AND score <= 100::numeric),
  score_tier text CHECK (score_tier = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text])),
  evidence_found text,
  missing_gap text,
  action_priority text CHECK (action_priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text])),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resume_jd_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT resume_jd_metrics_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.resume_analyses(id)
);

CREATE TABLE public.resume_quality_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  sub_metric text NOT NULL,
  score numeric CHECK (score >= 0::numeric AND score <= 100::numeric),
  justification text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resume_quality_scores_pkey PRIMARY KEY (id),
  CONSTRAINT resume_quality_scores_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.resume_analyses(id)
);

CREATE TABLE public.resume_improvements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['Missing Content'::text, 'Reordering Recommendations'::text, 'Skill Gap Roadmap'::text])),
  item_text text NOT NULL,
  why_it_matters text,
  priority text CHECK (priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text])),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resume_improvements_pkey PRIMARY KEY (id),
  CONSTRAINT resume_improvements_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.resume_analyses(id)
);

CREATE TABLE public.resume_bullet_rewrites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  issue_label text NOT NULL,
  original_bullet text NOT NULL,
  diagnosis text NOT NULL,
  rewrite_1 text,
  rewrite_2 text,
  rewrite_3 text,
  before_score numeric CHECK (before_score >= 0::numeric AND before_score <= 100::numeric),
  after_score numeric CHECK (after_score >= 0::numeric AND after_score <= 100::numeric),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resume_bullet_rewrites_pkey PRIMARY KEY (id),
  CONSTRAINT resume_bullet_rewrites_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.resume_analyses(id)
);

CREATE TABLE public.resume_final_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['Top 3 Fixes'::text, 'Must-Address Gaps'::text, 'Quick Wins'::text, 'Longer Improvements'::text])),
  recommendation_text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resume_final_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT resume_final_recommendations_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.resume_analyses(id)
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'processing'::text CHECK (status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR'::text,
  razorpay_payment_id text,
  razorpay_signature text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  credits integer DEFAULT 6,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.support (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ticket_id text,
  name text,
  email_id text,
  issue_domain text,
  description text,
  assigned_to text,
  status text,
  notes text,
  updated_at timestamp with time zone,
  CONSTRAINT support_pkey PRIMARY KEY (id)
);

CREATE TABLE public.superadmin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  email_id text,
  username text,
  password text,
  updated_at text,
  role USER-DEFINED,
  CONSTRAINT superadmin_users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.report_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid,
  resume_analysis_id uuid,
  report_type text NOT NULL CHECK (report_type = ANY (ARRAY['job'::text, 'resume_analysis'::text, 'resume_optimization'::text, 'resume_creation'::text])),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT report_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT report_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT report_feedback_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.jobs(id),
  CONSTRAINT report_feedback_resume_analysis_id_fkey FOREIGN KEY (resume_analysis_id) REFERENCES public.resume_analyses(id)
);

CREATE TABLE public.resume_optimizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  optimization_summary text NOT NULL,
  job_description text NOT NULL,
  original_resume_data jsonb NOT NULL,
  optimized_resume_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  analysis_id uuid,
  overall_match_score_reasoning text,
  quality_scores_reasoning jsonb,
  CONSTRAINT resume_optimizations_pkey PRIMARY KEY (id),
  CONSTRAINT resume_optimizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT resume_optimizations_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.resume_analyses(id)
);

CREATE TABLE public.portfolio_websites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'creating'::text CHECK (status = ANY (ARRAY['creating'::text, 'completed'::text, 'failed'::text])),
  zip_file_path text,
  preview_url text,
  resume_version text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_websites_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_websites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.portfolio_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  section_type text NOT NULL CHECK (section_type = ANY (ARRAY['hero'::text, 'about'::text, 'experience'::text, 'education'::text, 'project'::text, 'skill'::text, 'achievement'::text, 'certification'::text, 'contact'::text])),
  section_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_sections_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_sections_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_hero (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL UNIQUE,
  tagline text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_hero_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_hero_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_about (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL UNIQUE,
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_about_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_about_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_experiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  role text NOT NULL,
  company text NOT NULL,
  location text,
  start_date text,
  end_date text,
  description text,
  bullets ARRAY,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_experiences_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_experiences_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_educations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  degree text NOT NULL,
  institution text NOT NULL,
  location text,
  start_date text,
  end_date text,
  gpa text,
  percentage text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_educations_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_educations_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  technologies ARRAY,
  link text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_projects_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_projects_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL UNIQUE,
  technical ARRAY,
  soft ARRAY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_skills_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_skills_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_achievements_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  name text NOT NULL,
  issuer text,
  date text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_certifications_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.portfolio_contact (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL UNIQUE,
  email text,
  phone text,
  location text,
  linkedin text,
  portfolio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_contact_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_contact_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolio_websites(id)
);

CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_start_time time with time zone NOT NULL,
  scheduled_end_time time with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT schedules_pkey PRIMARY KEY (id),
  CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT schedules_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

CREATE TABLE public.session_windows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  position_name text NOT NULL,
  start_datetime timestamp with time zone NOT NULL,
  end_datetime timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_windows_pkey PRIMARY KEY (id)
);

CREATE TABLE public.viva_evaluations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  ai_marks numeric,
  final_marks numeric,
  evaluation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_insights jsonb DEFAULT '{}'::jsonb,
  professor_feedback text,
  is_published boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  video_link text,
  CONSTRAINT viva_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT viva_evaluations_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT viva_evaluations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.user_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_role text NOT NULL,
  career_goal text NOT NULL,
  interests ARRAY DEFAULT '{}'::text[],
  constraints jsonb DEFAULT '{}'::jsonb,
  timeline text,
  additional_answers jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_goals_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roadmaps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  roadmap_data jsonb NOT NULL,
  readiness_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'archived'::text, 'draft'::text])),
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roadmaps_pkey PRIMARY KEY (id),
  CONSTRAINT roadmaps_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.user_goals(id)
);

CREATE TABLE public.roadmap_phases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL,
  title text NOT NULL,
  duration text NOT NULL,
  description text,
  phase_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roadmap_phases_pkey PRIMARY KEY (id),
  CONSTRAINT roadmap_phases_roadmap_id_fkey FOREIGN KEY (roadmap_id) REFERENCES public.roadmaps(id)
);

CREATE TABLE public.roadmap_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL,
  phase_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'learning'::text CHECK (type = ANY (ARRAY['learning'::text, 'project'::text, 'practice'::text, 'revision'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  status text NOT NULL DEFAULT 'todo'::text CHECK (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text, 'skipped'::text])),
  estimated_hours integer DEFAULT 0,
  actual_hours integer DEFAULT 0,
  resources ARRAY DEFAULT '{}'::text[],
  expected_outcome text,
  task_order integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roadmap_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT roadmap_tasks_roadmap_id_fkey FOREIGN KEY (roadmap_id) REFERENCES public.roadmaps(id),
  CONSTRAINT roadmap_tasks_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.roadmap_phases(id)
);

CREATE TABLE public.roadmap_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  expected_date text,
  success_criteria text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  milestone_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roadmap_milestones_pkey PRIMARY KEY (id),
  CONSTRAINT roadmap_milestones_roadmap_id_fkey FOREIGN KEY (roadmap_id) REFERENCES public.roadmaps(id)
);

CREATE TABLE public.roadmap_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL DEFAULT 'general'::text CHECK (feedback_type = ANY (ARRAY['general'::text, 'task_difficulty'::text, 'pace'::text, 'relevance'::text, 'mentor_request'::text])),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roadmap_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT roadmap_feedback_roadmap_id_fkey FOREIGN KEY (roadmap_id) REFERENCES public.roadmaps(id)
);

CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.admin_logins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  organization_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admin_logins_pkey PRIMARY KEY (id),
  CONSTRAINT admin_logins_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL
);

CREATE TABLE public.vivas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_login_id uuid NOT NULL,
  name character varying NOT NULL,
  duration character varying NOT NULL,
  students_assigned integer NOT NULL DEFAULT 0,
  start_date_and_time timestamp with time zone,
  end_date_and_time timestamp with time zone,
  jd_summary text,
  assigned_student_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT vivas_pkey PRIMARY KEY (id),
  CONSTRAINT vivas_admin_login_id_fkey FOREIGN KEY (admin_login_id) REFERENCES public.admin_logins(id) ON DELETE CASCADE
);

CREATE TABLE public.users_login (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email_id character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  org_id uuid,
  department character varying,
  course character varying,
  division character varying,
  prn character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_login_pkey PRIMARY KEY (id),
  CONSTRAINT users_login_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL
);
