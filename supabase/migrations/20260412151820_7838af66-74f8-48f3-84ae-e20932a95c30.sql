
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'learner');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'learner',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Auto-assign learner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  grade_level TEXT NOT NULL DEFAULT 'Grade 1-3',
  language TEXT NOT NULL DEFAULT 'SASL',
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage videos" ON public.videos
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Learners can view published videos" ON public.videos
  FOR SELECT USING (status = 'published');

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Learners can view lessons" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND v.status = 'published'
    )
  );

-- SASL Gloss Chunks (segments)
CREATE TABLE public.saslgloss_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  start_sec NUMERIC NOT NULL DEFAULT 0,
  end_sec NUMERIC NOT NULL DEFAULT 0,
  sasl_gloss TEXT DEFAULT '',
  english_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saslgloss_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chunks" ON public.saslgloss_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id AND public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Learners can view chunks" ON public.saslgloss_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.videos v ON v.id = l.video_id
      WHERE l.id = lesson_id AND v.status = 'published'
    )
  );

-- English words (per-word entries for karaoke)
CREATE TABLE public.eng_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES public.saslgloss_chunks(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  start_sec NUMERIC NOT NULL DEFAULT 0,
  end_sec NUMERIC NOT NULL DEFAULT 0,
  word_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eng_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage eng_words" ON public.eng_words
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.saslgloss_chunks c
      JOIN public.lessons l ON l.id = c.lesson_id
      WHERE c.id = chunk_id AND public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Learners can view eng_words" ON public.eng_words
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saslgloss_chunks c
      JOIN public.lessons l ON l.id = c.lesson_id
      JOIN public.videos v ON v.id = l.video_id
      WHERE c.id = chunk_id AND v.status = 'published'
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chunks_updated_at
  BEFORE UPDATE ON public.saslgloss_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Admins can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update videos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));
