import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, CheckCircle2, BookOpen } from 'lucide-react';

export const Route = createFileRoute('/admin/users')({
  head: () => ({
    meta: [
      { title: 'Manage Learners — SASL Read' },
      { name: 'description', content: 'View learner progress and statistics' },
    ],
  }),
  component: AdminUsersPage,
});

interface LearnerInfo {
  userId: string;
  email: string;
  completedCount: number;
  totalLessons: number;
  joinedAt: string;
}

function AdminUsersPage() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [learners, setLearners] = useState<LearnerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate({ to: '/' });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!user || role !== 'admin') return;

    async function load() {
      // Get all learner roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'learner');

      if (!roles || roles.length === 0) {
        setLearners([]);
        setLoading(false);
        return;
      }

      // Get all progress
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('user_id, completed')
        .eq('completed', true);

      // Get total published lessons count
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true });

      const progressMap = new Map<string, number>();
      progress?.forEach(p => {
        progressMap.set(p.user_id, (progressMap.get(p.user_id) ?? 0) + 1);
      });

      const learnerList: LearnerInfo[] = roles.map(r => ({
        userId: r.user_id,
        email: r.user_id.slice(0, 8) + '...',
        completedCount: progressMap.get(r.user_id) ?? 0,
        totalLessons: totalLessons ?? 0,
        joinedAt: '',
      }));

      setLearners(learnerList);
      setLoading(false);
    }
    load();
  }, [user, role]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const totalCompleted = learners.reduce((s, l) => s + l.completedCount, 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Learners</h1>
        <p className="mt-2 text-lg text-muted-foreground">Track learner progress across all lessons</p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Learners</p>
                <p className="text-2xl font-bold text-foreground">{learners.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Completions</p>
                <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <BookOpen className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. per Learner</p>
                <p className="text-2xl font-bold text-foreground">
                  {learners.length > 0 ? (totalCompleted / learners.length).toFixed(1) : '0'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learner table */}
        {learners.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-xl text-muted-foreground">No learners registered yet.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border bg-card shadow">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-4 text-base font-semibold text-foreground">Learner ID</th>
                  <th className="px-6 py-4 text-base font-semibold text-foreground">Completed</th>
                  <th className="px-6 py-4 text-base font-semibold text-foreground">Progress</th>
                </tr>
              </thead>
              <tbody>
                {learners.map(l => {
                  const pct = l.totalLessons > 0 ? Math.round((l.completedCount / l.totalLessons) * 100) : 0;
                  return (
                    <tr key={l.userId} className="border-b last:border-0">
                      <td className="px-6 py-4 text-base font-mono text-foreground">{l.userId.slice(0, 12)}...</td>
                      <td className="px-6 py-4 text-base text-foreground">
                        {l.completedCount} / {l.totalLessons}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-primary/20">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
