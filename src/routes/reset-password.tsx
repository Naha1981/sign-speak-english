import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Reset Password — SASL Read' },
      { name: 'description', content: 'Reset your SASL Read password' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SASL Read</h1>
        </div>

        <Card className="shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription className="text-base">
              {sent ? 'Check your email for a password reset link.' : "Enter your email and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-lg text-muted-foreground">
                  We sent a reset link to <strong className="text-foreground">{email}</strong>
                </p>
                <Button variant="outline" size="lg" asChild className="w-full">
                  <Link to="/">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back to Sign In
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-12 text-lg"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full h-12 text-lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Send Reset Link
                </Button>
                <p className="text-center">
                  <Link to="/" className="text-base font-semibold text-primary hover:underline">
                    Back to Sign In
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
