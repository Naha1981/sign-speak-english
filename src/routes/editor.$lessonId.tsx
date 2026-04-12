import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { LessonEditor } from '@/components/LessonEditor';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/editor/$lessonId')({
  head: () => ({
    meta: [
      { title: 'Lesson Editor — SASL Read' },
      { name: 'description', content: 'Edit lesson segments and translations' },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  const { lessonId } = Route.useParams();
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate({ to: '/' });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    async function load() {
      const { data: lesson } = await supabase
        .from('lessons')
        .select('*, videos(*)')
        .eq('id', lessonId)
        .single();

      if (lesson) {
        setLessonTitle(lesson.title);
        const video = lesson.videos as unknown as { video_url: string | null };
        setVideoUrl(video?.video_url ?? null);
      }
      setLoading(false);
    }
    if (user && role === 'admin') load();
  }, [lessonId, user, role]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Edit: {lessonTitle}</h1>
        {videoUrl ? (
          <LessonEditor lessonId={lessonId} videoUrl={videoUrl} />
        ) : (
          <p className="text-lg text-muted-foreground">No video URL found for this lesson.</p>
        )}
      </main>
    </div>
  );
}
