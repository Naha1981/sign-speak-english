import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { KaraokePlayer } from '@/components/KaraokePlayer';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/play/$lessonId')({
  head: () => ({
    meta: [
      { title: 'Lesson Player — SASL Read' },
      { name: 'description', content: 'Watch SASL videos with karaoke-style English text' },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { lessonId } = Route.useParams();
  const { user, role, signOut } = useAuth();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [loading, setLoading] = useState(true);

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
    load();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      {videoUrl ? (
        <KaraokePlayer lessonId={lessonId} videoUrl={videoUrl} title={lessonTitle} />
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-xl text-muted-foreground">Lesson not found or no video available.</p>
        </div>
      )}
    </div>
  );
}
