import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { KaraokePlayer } from '@/components/KaraokePlayer';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface EngWord {
  eng_word: string;
  start_sec: number;
  end_sec: number;
  saslgloss_id: string;
}

interface SASLGlossChunk {
  start_sec: number;
  end_sec: number;
  saslgloss?: string | null;
  english_text: string;
}

interface LessonFullOut {
  lesson: {
    id: string;
    title: string;
    video_id: string;
    status: string;
    created_at: string;
  };
  chunks: SASLGlossChunk[];
  eng_words: EngWord[];
  ai_suggestions: any[];
}

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
  const [lessonData, setLessonData] = useState<LessonFullOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`http://localhost:8000/lessons/${lessonId}`);
        if (!response.ok) {
          throw new Error('Could not load lesson');
        }
        const data: LessonFullOut = await response.json();
        setLessonData(data);
      } catch (error) {
        console.error('Error loading lesson:', error);
        // Fallback to original Supabase loading if backend fails
        const { data: lesson } = await supabase
          .from('lessons')
          .select('*, videos(*)')
          .eq('id', lessonId)
          .single();

        if (lesson) {
          setLessonData({
            lesson: {
              id: lesson.id,
              title: lesson.title,
              video_id: lesson.video_id,
              status: lesson.status,
              created_at: lesson.created_at,
            },
            chunks: [],
            eng_words: [],
            ai_suggestions: [],
          });
        }
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

  if (!lessonData) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader user={user} role={role} onSignOut={signOut} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-xl text-muted-foreground">Lesson not found.</p>
        </div>
      </div>
    );
  }

  // Get video URL from Supabase (since backend doesn't return it directly)
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function getVideoUrl() {
      const { data: video } = await supabase
        .from('videos')
        .select('storage_url')
        .eq('id', lessonData.lesson.video_id)
        .single();
      setVideoUrl(video?.storage_url ?? null);
    }
    getVideoUrl();
  }, [lessonData.lesson.video_id]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      {videoUrl ? (
        <KaraokePlayer 
          lessonId={lessonId} 
          videoUrl={videoUrl} 
          title={lessonData.lesson.title}
          chunks={lessonData.chunks}
          engWords={lessonData.eng_words}
        />
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-xl text-muted-foreground">Video not available.</p>
        </div>
      )}
    </div>
  );
}
