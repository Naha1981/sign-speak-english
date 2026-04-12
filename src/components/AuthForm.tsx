import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export function AuthForm({ onSignIn, onSignUp }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (isLogin) {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
        setSuccess('Account created! You can now sign in.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SASL Read</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Learn English through South African Sign Language
          </p>
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">{isLogin ? 'Welcome back' : 'Create account'}</CardTitle>
            <CardDescription className="text-base">
              {isLogin ? 'Sign in to continue learning' : 'Start your learning journey'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 text-lg"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-base font-medium text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-success/10 p-3 text-base font-medium text-success">
                  {success}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full h-12 text-lg font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>

              {isLogin && (
                <p className="text-center">
                  <Link to="/reset-password" className="text-base text-primary font-semibold hover:underline">
                    Forgot your password?
                  </Link>
                </p>
              )}

              <p className="text-center text-base text-muted-foreground">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
