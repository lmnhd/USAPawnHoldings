'use client';

import { useState, Suspense } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  
  // Determine role from redirect path
  const role = redirectPath.startsWith('/staff') ? 'staff' : 'owner';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'login', role }),
      });

      if (!res.ok) {
        throw new Error('Invalid password');
      }

      // Redirect to original path or default based on role
      router.push(redirectPath);
    } catch {
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
            <span className="text-4xl mb-3 block" aria-hidden="true">🔴</span>
            <h1 className="font-display text-3xl font-bold text-vault-gold group-hover:text-vault-gold-light transition-colors">
              USA PAWN HOLDINGS
            </h1>
          </Link>
          <p className="text-vault-text-muted mt-3 font-body text-sm tracking-wide uppercase">
            {role === 'staff' ? 'Staff Access' : 'Owner Access'}
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-vault-surface-elevated border-vault-gold/20 rounded-2xl shadow-2xl shadow-black/50">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit}>
              <Label
                htmlFor="password"
                className="block text-sm font-medium text-vault-text-light mb-2 font-body"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                autoFocus
                className="w-full bg-vault-surface border-vault-gold/20 rounded-lg px-4 py-3 text-vault-text-light placeholder:text-vault-text-muted/50 focus:border-vault-gold focus:ring-1 focus:ring-vault-gold focus:outline-none transition-colors font-body"
              />

              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="mt-3 bg-transparent border-vault-danger/30 text-vault-danger">
                  <AlertDescription className="text-sm font-body flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full mt-6 gold-gradient text-vault-text-on-gold px-6 py-3 rounded-lg font-semibold font-body hover:shadow-lg hover:shadow-vault-gold/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo Note */}
            <div className="mt-6">
              <Separator className="bg-vault-gold/10 mb-6" />
              <p className="text-xs text-vault-text-muted font-body text-center">
                Demo Password:{' '}
                <code className="bg-vault-surface px-2 py-1 rounded font-mono text-vault-gold/80">
                  12345
                </code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-vault-text-muted hover:text-vault-gold transition-colors font-body"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="animate-pulse text-vault-gold">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
