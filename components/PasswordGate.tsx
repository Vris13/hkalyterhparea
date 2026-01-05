'use client';

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { checkPassword, setAuthCookie, isAuthenticated } from '@/lib/auth';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsAuth(isAuthenticated());
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (checkPassword(password)) {
      setAuthCookie();
      setIsAuth(true);
      setError('');
    } else {
      setError('Λάθος κωδικός. Προσπάθησε ξανά.');
      setPassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-100 to-peach-100">
        <div className="animate-pulse text-warm-600">Φόρτωση...</div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-100 to-peach-100 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-peach-100 p-4 rounded-full">
              <Lock className="w-8 h-8 text-peach-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center text-warm-800 mb-2">
            Memory Book
          </h1>
          <p className="text-center text-warm-600 mb-8">
            Εισάγετε τον κωδικό για να συνεχίσετε
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Κωδικός"
                className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-peach-500 to-peach-600 hover:from-peach-600 hover:to-peach-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Είσοδος
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
