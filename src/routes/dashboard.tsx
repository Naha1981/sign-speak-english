import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { VideoCard } from '@/components/VideoCard';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard — SASL Read' },
      { name: 'description', content: 'Manage your SASL video lessons' },
    ],
  }),
  component: DashboardPage,
});

interface VideoWithLesson {
  id: string;
  title: string;
  grade_level: string;
  status: string;
  thumbnail_url: string | null;
  video_url: string | null;
  lessonId: string | null;
}

function DashboardPage() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoWithLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate({ to: '/' });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!user || role !== 'admin') return;

    async function load() {
      const { data: videoData } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (videoData) {
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('id, video_id');

        const lessonMap = new Map(lessonData?.map(l => [l.video_id, l.id]) ?? []);

        setVideos(videoData.map(v => ({
          id: v.id,
          title: v.title,
          grade_level: v.grade_level,
          status: v.status,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          lessonId: lessonMap.get(v.id) ?? null,
        })));
      }
      setLoading(false);
    }
    load();
  }, [user, role]);

  const handlePublish = async (videoId: string) => {
    const { error } = await supabase
      .from('videos')
      .update({ status: 'published' })
      .eq('id', videoId);
    if (error) {
      toast.error('Failed to publish');
    } else {
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'published' } : v));
      toast.success('Video published!');
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Video Dashboard</h1>
            <p className="mt-1 text-lg text-muted-foreground">Manage your SASL lesson videos</p>
          </div>
          <Button size="lg" asChild className="h-12 text-lg">
            <Link to="/upload">
              <Plus className="mr-2 h-5 w-5" />
              Upload Video
            </Link>
          </Button>
        </div>

        {videos.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="text-xl text-muted-foreground">No videos yet. Upload your first SASL video to get started!</p>
            <Button size="lg" asChild className="mt-6 h-12 text-lg">
              <Link to="/upload">
                <Plus className="mr-2 h-5 w-5" />
                Upload Video
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map(v => (
              <VideoCard
                key={v.id}
                id={v.id}
                title={v.title}
                gradeLevel={v.grade_level}
                status={v.status}
                thumbnailUrl={v.thumbnail_url}
                lessonId={v.lessonId}
                isAdmin
                onPublish={handlePublish}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
