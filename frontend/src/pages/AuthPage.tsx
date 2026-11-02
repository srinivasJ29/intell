import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-mono-offwhite p-4 select-none">
      {/* Container */}
      <div className="w-full max-w-md bg-mono-white border border-mono-border rounded-xl shadow-glass overflow-hidden">
        {/* Header Branding */}
        <div className="p-8 pb-6 border-b border-mono-border bg-mono-offwhite text-center">
          <div className="w-12 h-12 mx-auto rounded-lg bg-mono-deepblack flex items-center justify-center text-mono-white font-mono font-bold text-lg mb-3 shadow-subtle">
            IR
          </div>
          <h1 className="font-heading font-bold text-2xl text-mono-deepblack tracking-tight mb-1">
            IntelliResearch
          </h1>
          <p className="text-xs text-mono-medium leading-relaxed">
            Desktop-class AI multi-document research and comparative literature intelligence.
          </p>

          {/* Mode Tabs */}
          <div className="mt-6 flex rounded-lg bg-mono-light p-1 border border-mono-border">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                !isRegister
                  ? 'bg-mono-white text-mono-deepblack shadow-subtle'
                  : 'text-mono-dark hover:text-mono-deepblack'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                isRegister
                  ? 'bg-mono-white text-mono-deepblack shadow-subtle'
                  : 'text-mono-dark hover:text-mono-deepblack'
              }`}
            >
              Register Account
            </button>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {isRegister && (
            <Input
              label="Full Name / Academic Title"
              placeholder="e.g. Dr. Elena Vance"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="researcher@institution.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full mt-2" size="md" isLoading={isLoading}>
            <span>{isRegister ? 'Create Research Account' : 'Authenticate & Enter'}</span>
            <ArrowRight size={15} />
          </Button>

          <div className="pt-4 border-t border-mono-border/60 flex items-center justify-between text-[11px] text-mono-medium">
            <span className="flex items-center gap-1 font-mono">
              <ShieldCheck size={13} className="text-mono-dark" />
              Argon2id Encrypted
            </span>
            <span className="font-mono">v1.0.0 Production</span>
          </div>
        </form>
      </div>
    </div>
  );
};

