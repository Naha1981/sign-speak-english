import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { VideoCard } from '@/components/VideoCard';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Users, ArrowLeft, Clock3, Send } from 'lucide-react';
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

  const handleUnpublish = async (videoId: string) => {
    const { error } = await supabase
      .from('videos')
      .update({ status: 'draft' })
      .eq('id', videoId);
    if (error) {
      toast.error('Failed to unpublish');
    } else {
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'draft' } : v));
      toast.success('Video set to draft');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video and its lesson? This cannot be undone.')) return;

    // Delete lesson + chunks + words first (cascading)
    const video = videos.find(v => v.id === videoId);
    if (video?.lessonId) {
      // eng_words cascade from chunks, chunks cascade from lessons
      await supabase.from('lesson_progress').delete().eq('lesson_id', video.lessonId);
      await supabase.from('lessons').delete().eq('id', video.lessonId);
    }

    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (error) {
      toast.error('Failed to delete video');
    } else {
      setVideos(prev => prev.filter(v => v.id !== videoId));
      toast.success('Video deleted');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const draftCount = videos.filter((video) => video.status !== 'published').length;
  const publishedCount = videos.filter((video) => video.status === 'published').length;
  const needsLessonCount = videos.filter((video) => !video.lessonId).length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin studio</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Manage lesson publishing</h1>
            <p className="mt-1 text-lg text-muted-foreground">Upload → edit segments → review timing → publish.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="outline" asChild className="h-12 text-lg">
              <Link to="/lessons">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Learner View
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 text-lg">
              <Link to="/admin/users">
                <Users className="mr-2 h-5 w-5" />
                Learners
              </Link>
            </Button>
            <Button size="lg" asChild className="h-12 text-lg">
              <Link to="/upload">
                <Plus className="mr-2 h-5 w-5" />
                Upload Video
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock3 className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">Drafts</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{draftCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Still needs review before learners can see it.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Send className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">Published</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{publishedCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Live lessons available to learners right now.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">Needs lesson</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{needsLessonCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Videos that still need lesson structure and timings.</p>
          </div>
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
                videoUrl={v.video_url}
                lessonId={v.lessonId}
                isAdmin
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
