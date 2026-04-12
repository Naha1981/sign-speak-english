import { Link } from '@tanstack/react-router';
import { LogOut, BookOpen, Video, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppRole } from '@/hooks/use-auth';
import type { User } from '@supabase/supabase-js';

interface AppHeaderProps {
  user: User | null;
  role: AppRole | null;
  onSignOut: () => void;
}

export function AppHeader({ user, role, onSignOut }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">SASL Read</span>
        </Link>

        {user && (
          <nav className="flex items-center gap-2">
            {role === 'admin' && (
              <>
                <Button variant="ghost" size="lg" asChild>
                  <Link to="/dashboard">
                    <Video className="mr-2 h-5 w-5" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <Link to="/upload">
                    <Upload className="mr-2 h-5 w-5" />
                    Upload
                  </Link>
                </Button>
              </>
            )}
            {role === 'learner' && (
              <Button variant="ghost" size="lg" asChild>
                <Link to="/lessons">
                  <BookOpen className="mr-2 h-5 w-5" />
                  My Lessons
                </Link>
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={onSignOut}>
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
