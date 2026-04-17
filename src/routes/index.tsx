import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AuthForm } from '@/components/AuthForm';
import { AppHeader } from '@/components/AppHeader';
import { BookOpen, Users, Video } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-illustration.jpg';

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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Learn English Through Sign Language
              </h1>
              <p className="mt-4 max-w-xl text-xl text-muted-foreground">
                Watch SASL videos with karaoke-style word highlighting. No audio needed — learn at your own pace.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button size="lg" asChild className="h-14 px-8 text-lg">
                  <Link to="/lessons">Browse Lessons</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src={heroImage}
                alt="Children learning sign language in a classroom with karaoke-style text"
                width={1920}
                height={768}
                className="rounded-2xl shadow-2xl ring-1 ring-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
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
      </section>
    </div>
  );
}
