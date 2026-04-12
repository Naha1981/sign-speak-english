import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@tanstack/react-router';
import { Loader2, Play, Video, CheckCircle2, Filter } from 'lucide-react';

export const Route = createFileRoute('/lessons')({
  head: () => ({
    meta: [
      { title: 'Lessons — SASL Read' },
      { name: 'description', content: 'Browse available SASL lessons' },
    ],
  }),
  component: LessonsPage,
});

interface LessonItem {
  id: string;
  title: string;
  gradeLevel: string;
  thumbnailUrl: string | null;
  completed: boolean;
}

function LessonsPage() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      if (!user) return;

      const { data } = await supabase
        .from('lessons')
        .select('id, title, videos(grade_level, thumbnail_url, status)')
        .order('created_at', { ascending: false });

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .eq('completed', true);

      const completedSet = new Set(progressData?.map(p => p.lesson_id) ?? []);

      if (data) {
        const items: LessonItem[] = [];
        for (const d of data) {
          const video = d.videos as unknown as { grade_level: string; thumbnail_url: string | null; status: string } | null;
          if (role === 'admin' || video?.status === 'published') {
            items.push({
              id: d.id,
              title: d.title,
              gradeLevel: video?.grade_level ?? 'Unknown',
              thumbnailUrl: video?.thumbnail_url ?? null,
              completed: completedSet.has(d.id),
            });
          }
        }
        setLessons(items);
      }
      setLoading(false);
    }
    if (!authLoading && user) load();
  }, [user, role, authLoading]);

  const filteredLessons = gradeFilter === 'all'
    ? lessons
    : lessons.filter(l => l.gradeLevel === gradeFilter);

  const completedCount = filteredLessons.filter(l => l.completed).length;
  const progressPercent = filteredLessons.length > 0 ? Math.round((completedCount / filteredLessons.length) * 100) : 0;

  const gradeOptions = [...new Set(lessons.map(l => l.gradeLevel))].sort();

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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lessons</h1>
            <p className="mt-2 text-lg text-muted-foreground">Watch SASL videos and learn English</p>
          </div>

          {gradeOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-10 w-44">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {gradeOptions.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {filteredLessons.length > 0 && role === 'learner' && (
          <div className="mt-6 rounded-xl bg-card p-5 shadow ring-1 ring-border">
            <div className="flex items-center justify-between text-base font-semibold">
              <span className="text-foreground">Your Progress</span>
              <span className="text-primary">{completedCount} / {filteredLessons.length} completed</span>
            </div>
            <Progress value={progressPercent} className="mt-3 h-3" />
          </div>
        )}

        {filteredLessons.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-xl text-muted-foreground">
              {lessons.length === 0 ? 'No lessons available yet. Check back soon!' : 'No lessons match this filter.'}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLessons.map(lesson => (
              <Card key={lesson.id} className="group relative overflow-hidden transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20">
                {lesson.completed && (
                  <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    Done
                  </div>
                )}
                <div className="relative aspect-video bg-muted flex items-center justify-center">
                  {lesson.thumbnailUrl ? (
                    <img src={lesson.thumbnailUrl} alt={lesson.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Video className="h-12 w-12 text-muted-foreground/40" />
                  )}
                </div>
                <CardContent className="p-5">
                  <h3 className="text-xl font-bold text-card-foreground">{lesson.title}</h3>
                  <p className="mt-1 text-base text-muted-foreground">{lesson.gradeLevel}</p>
                  <Button size="lg" className="mt-4 w-full h-12 text-lg" asChild>
                    <Link to="/play/$lessonId" params={{ lessonId: lesson.id }}>
                      <Play className="mr-2 h-5 w-5" />
                      {lesson.completed ? 'Replay' : 'Start Lesson'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
