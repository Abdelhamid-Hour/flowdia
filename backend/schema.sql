-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.automation_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_active boolean DEFAULT false,
  topic_cycle text DEFAULT 'weekly'::text CHECK (topic_cycle = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
  niche text,
  target_audience text,
  language text DEFAULT 'English (US)'::text,
  custom_instructions text,
  image_source text DEFAULT 'ai'::text CHECK (image_source = ANY (ARRAY['ai'::text, 'stock'::text, 'auto'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_instructions text,
  frequency_per_day integer DEFAULT 2,
  active_days ARRAY DEFAULT ARRAY['Mon'::text, 'Tue'::text, 'Wed'::text, 'Thu'::text, 'Fri'::text],
  global_times ARRAY DEFAULT ARRAY['09:00'::text, '15:00'::text],
  CONSTRAINT automation_settings_pkey PRIMARY KEY (id),
  CONSTRAINT automation_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid,
  caption text,
  image_url text,
  scheduled_publish_time timestamp with time zone NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'scheduled'::text, 'pushed'::text, 'failed'::text, 'deleted'::text])),
  native_post_id text,
  error_log text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT posts_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  full_name text,
  avatar_url text,
  email text UNIQUE,
  mfa_enabled boolean DEFAULT false,
  is_mfa_active boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.social_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id text NOT NULL,
  account_name text,
  avatar_url text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamp with time zone,
  status text DEFAULT 'connected'::text CHECK (status = ANY (ARRAY['connected'::text, 'disconnected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT social_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT social_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.topics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  brief text,
  target_date date NOT NULL,
  status text DEFAULT '''scheduled''::text'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT topics_pkey PRIMARY KEY (id),
  CONSTRAINT topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  timezone text DEFAULT 'UTC'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);