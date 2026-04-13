import { Link } from '@tanstack/react-router';
import { LogOut, BookOpen, Video, Upload, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import type { AppRole } from '@/hooks/use-auth';
import type { User } from '@supabase/supabase-js';
import { useState } from 'react';

interface AppHeaderProps {
  user: User | null;
  role: AppRole | null;
  onSignOut: () => void;
}

function NavLinks({ role, onSignOut, onClose }: { role: AppRole | null; onSignOut: () => void; onClose?: () => void }) {
  const handleClick = () => onClose?.();

  return (
    <>
      {role === 'admin' && (
        <>
          <Button variant="ghost" size="lg" asChild onClick={handleClick}>
            <Link to="/dashboard">
              <Video className="mr-2 h-5 w-5" />
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" size="lg" asChild onClick={handleClick}>
            <Link to="/upload">
              <Upload className="mr-2 h-5 w-5" />
              Upload
            </Link>
          </Button>
        </>
      )}
      {role === 'learner' && (
        <Button variant="ghost" size="lg" asChild onClick={handleClick}>
          <Link to="/lessons">
            <BookOpen className="mr-2 h-5 w-5" />
            My Lessons
          </Link>
        </Button>
      )}
      <Button variant="outline" size="lg" onClick={() => { onSignOut(); handleClick(); }}>
        <LogOut className="mr-2 h-5 w-5" />
        Sign Out
      </Button>
    </>
  );
}

export function AppHeader({ user, role, onSignOut }: AppHeaderProps) {
  const [open, setOpen] = useState(false);

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
          <>
            {/* Desktop nav */}
            <nav className="hidden items-center gap-2 sm:flex">
              <NavLinks role={role} onSignOut={onSignOut} />
            </nav>

            {/* Mobile hamburger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="text-lg font-bold">Menu</SheetTitle>
                <nav className="mt-6 flex flex-col gap-3">
                  <NavLinks role={role} onSignOut={onSignOut} onClose={() => setOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </header>
  );
}
