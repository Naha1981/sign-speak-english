import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, BookOpen, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import type { AppRole } from '@/hooks/use-auth';
import type { User as SupaUser } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useIsMobile } from '@/hooks/use-mobile';

const DESKTOP_GESTURE_WINDOW_MS = 250;
const MOBILE_LONG_PRESS_MS = 3000;

interface AppHeaderProps {
  user: SupaUser | null;
  role: AppRole | null;
  onSignOut: () => void;
}

function NavLinks({ role, onSignOut, onClose }: { role: AppRole | null; onSignOut: () => void; onClose?: () => void }) {
  const handleClick = () => onClose?.();

  return (
    <>
      {(role === 'learner' || role === 'admin') && (
        <Button variant="ghost" size="lg" asChild onClick={handleClick}>
          <Link to="/lessons">
            <BookOpen className="mr-2 h-5 w-5" />
            My Lessons
          </Link>
        </Button>
      )}
      <Button variant="ghost" size="lg" asChild onClick={handleClick}>
        <Link to="/profile">
          <User className="mr-2 h-5 w-5" />
          Profile
        </Link>
      </Button>
      <Button variant="outline" size="lg" onClick={() => { onSignOut(); handleClick(); }}>
        <LogOut className="mr-2 h-5 w-5" />
        Sign Out
      </Button>
    </>
  );
}

export function AppHeader({ user, role, onSignOut }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const clickTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const openAdminView = useCallback(() => {
    if (role !== 'admin') {
      toast('Admin tools are hidden for this account.', { duration: 1800 });
      return;
    }

    navigate({ to: '/dashboard' });
  }, [navigate, role]);

  const clearLongPress = useCallback(() => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleLogoClick = useCallback(() => {
    if (isMobile) {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      navigate({ to: '/' });
      return;
    }

    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      openAdminView();
      return;
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      navigate({ to: '/' });
      clickTimeoutRef.current = null;
    }, DESKTOP_GESTURE_WINDOW_MS);
  }, [isMobile, navigate, openAdminView]);

  const handleLogoPointerDown = useCallback(() => {
    if (!isMobile) return;

    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimeoutRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      openAdminView();
    }, MOBILE_LONG_PRESS_MS);
  }, [clearLongPress, isMobile, openAdminView]);

  useEffect(() => {
    return () => {
      clearLongPress();

      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [clearLongPress]);

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={handleLogoClick}
          onPointerDown={handleLogoPointerDown}
          onPointerUp={clearLongPress}
          onPointerLeave={clearLongPress}
          onPointerCancel={clearLongPress}
          aria-label="Go home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">SASL Read</span>
        </button>

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
