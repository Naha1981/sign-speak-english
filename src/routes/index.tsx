import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AuthForm } from '@/components/AuthForm';
import { AppHeader } from '@/components/AppHeader';
import { BookOpen, Users, Video } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'SASL Read — Learn English Through Sign Language' },
      { name: 'description', content: 'A learning platform that helps Deaf learners master English through South African Sign Language (SASL) videos with karaoke-style word highlighting.' },
      { property: 'og:title', content: 'SASL Read — Learn English Through Sign Language' },
      { property: 'og:description', content: 'Learn English through SASL videos with interactive karaoke-style lessons.' },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, role, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSignIn={signIn} onSignUp={signUp} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Welcome to SASL Read
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-muted-foreground">
            Learn English through South African Sign Language videos with interactive karaoke-style lessons.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-md ring-1 ring-border">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Video className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-card-foreground">SASL Videos</h3>
            <p className="mt-2 text-base text-muted-foreground">Watch sign language videos with synchronized English text</p>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-md ring-1 ring-border">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-card-foreground">Karaoke Learning</h3>
            <p className="mt-2 text-base text-muted-foreground">Words highlight in real-time as you watch — no audio needed</p>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-md ring-1 ring-border">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-card-foreground">For Everyone</h3>
            <p className="mt-2 text-base text-muted-foreground">Designed for Deaf learners with large fonts and high contrast</p>
          </div>
        </div>

        <div className="mt-12 flex justify-center gap-4">
          {role === 'admin' && (
            <Button size="lg" asChild className="h-14 px-8 text-lg">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
          <Button size="lg" variant={role === 'admin' ? 'outline' : 'default'} asChild className="h-14 px-8 text-lg">
            <Link to="/lessons">Browse Lessons</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
