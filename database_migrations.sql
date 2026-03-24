-- Migration: Add session_windows and schedules tables for Yudha Vivas scheduling

-- 1. Create the session_windows table
-- This table maps a position_name to a specific time window for scheduling
CREATE TABLE public.session_windows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  position_name text NOT NULL,
  start_datetime timestamp with time zone NOT NULL,
  end_datetime timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_windows_pkey PRIMARY KEY (id)
);

-- 2. Create the schedules table
-- This table stores the actual user bookings
CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_start_time time NOT NULL,
  scheduled_end_time time NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT schedules_pkey PRIMARY KEY (id),
  CONSTRAINT schedules_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- (Optional) If you have Row Level Security enabled, you may want to add policies like:
-- ALTER TABLE public.session_windows ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for all users" ON public.session_windows FOR SELECT USING (true);
-- 
-- ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for all users" ON public.schedules FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for all users" ON public.schedules FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update for all users" ON public.schedules FOR UPDATE USING (true);
