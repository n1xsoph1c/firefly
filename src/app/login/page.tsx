'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Cloud } from 'lucide-react';
import { Button, Input, Alert } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const data = await response.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950">
      {/* Gradient Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl shadow-violet-500/30 mb-6 animate-scale-in">
            <Cloud className="h-10 w-10 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-4xl font-bold text-gradient mb-2 animate-fade-in">
            {APP_NAME}
          </h2>
          <p className="text-zinc-400 text-sm animate-fade-in">
            Sign in to your cloud storage
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl animate-slide-up">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              id="email"
              name="email"
              type="email"
              required
              label="Email address"
              placeholder="your.email@example.com"
              leftIcon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              id="password"
              name="password"
              type="password"
              required
              label="Password"
              placeholder="Enter your password"
              leftIcon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <Alert variant="danger" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full justify-center"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-center text-xs text-zinc-500">
              Secure cloud storage for your files
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center">
          <p className="text-xs text-zinc-600">
            Powered by {APP_NAME} • Secure & Private
          </p>
        </div>
      </div>
    </div>
  );
}