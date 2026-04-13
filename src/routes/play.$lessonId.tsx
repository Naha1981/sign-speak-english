import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { LessonPlayer } from '@/components/LessonPlayer';
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      <LessonPlayer lessonId={lessonId} />
    </div>
  );
}
