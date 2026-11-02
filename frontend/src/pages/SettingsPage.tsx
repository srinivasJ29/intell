import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import {
  Settings,
  User,
  Shield,
  Sliders,
  Check,
  Cpu,
  Palette,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // AI Preferences
  const [llmProvider, setLlmProvider] = useState('openai-compatible');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState('0.1');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      const payload: any = { full_name: fullName };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      await api.request('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await refreshUser();
      setProfileSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header title="Settings & Preferences" subtitle="User account credentials, security & AI parameters" />

      <div className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Profile & Security Card */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-mono-border pb-4">
            <h3 className="font-heading font-bold text-base text-mono-deepblack flex items-center gap-2">
              <User size={18} />
              <span>Researcher Identity & Credentials</span>
            </h3>
            <p className="text-xs text-mono-dark mt-0.5">
              Manage your academic display name and encrypted authentication password.
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileSuccess && (
              <div className="p-3 text-xs text-mono-deepblack bg-mono-light border border-mono-border rounded-md flex items-center gap-2">
                <Check size={14} className="text-mono-black" />
                <span>Profile credentials updated successfully.</span>
              </div>
            )}
            {profileError && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
                {profileError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name / Academic Title"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Registered Email (Primary Identity)"
                value={user?.email || ''}
                disabled
              />
            </div>

            <div className="pt-2 border-t border-mono-border/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-mono-dark block mb-3">
                Update Password (Optional)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" isLoading={isSavingProfile}>
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* AI & RAG Preferences Card */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-mono-border pb-4">
            <h3 className="font-heading font-bold text-base text-mono-deepblack flex items-center gap-2">
              <Cpu size={18} />
              <span>AI Engine & Retrieval Hyperparameters</span>
            </h3>
            <p className="text-xs text-mono-dark mt-0.5">
              Configure OpenAI-compatible providers, temperature boundaries, and groundedness thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-mono-dark">
                LLM Provider
              </label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-mono-white border border-mono-border rounded-md text-mono-deepblack focus:outline-none focus:ring-1 focus:ring-mono-black"
              >
                <option value="openai-compatible">OpenAI-Compatible (OpenAI, Ollama, vLLM, Groq)</option>
                <option value="azure">Azure OpenAI Service</option>
                <option value="local">Local Native Synthesis</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-mono-dark">
                Model Identifier
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-mono-white border border-mono-border rounded-md text-mono-deepblack font-mono focus:outline-none focus:ring-1 focus:ring-mono-black"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-mono-dark">
                Sampling Temperature
              </label>
              <input
                type="number"
                step="0.05"
                min="0.0"
                max="1.0"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-mono-white border border-mono-border rounded-md text-mono-deepblack font-mono focus:outline-none focus:ring-1 focus:ring-mono-black"
              />
            </div>
          </div>

          <div className="p-3 bg-mono-offwhite border border-mono-border rounded-md text-xs text-mono-dark leading-relaxed font-mono">
            <strong>Groundedness Protocol:</strong> Temperature is calibrated to 0.1 to suppress speculative tokens and maximize verifiable citation accuracy across scientific equations and empirical tables.
          </div>
        </Card>

        {/* Visual Identity Spec */}
        <Card className="p-6">
          <h3 className="font-heading font-bold text-base text-mono-deepblack mb-2 flex items-center gap-2">
            <Palette size={18} />
            <span>Monochromatic Visual System</span>
          </h3>
          <p className="text-xs text-mono-dark mb-4">
            IntelliResearch enforces a distraction-free monochromatic palette engineered for 8+ hour research reading sessions.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              { name: 'Deep Black', hex: '#080808', bg: 'bg-[#080808]', text: 'text-white' },
              { name: 'Black', hex: '#111111', bg: 'bg-[#111111]', text: 'text-white' },
              { name: 'Dark Grey', hex: '#404040', bg: 'bg-[#404040]', text: 'text-white' },
              { name: 'Medium Grey', hex: '#A3A3A3', bg: 'bg-[#A3A3A3]', text: 'text-black' },
              { name: 'Border Grey', hex: '#E5E5E5', bg: 'bg-[#E5E5E5]', text: 'text-black' },
              { name: 'Light Grey', hex: '#F1F1F1', bg: 'bg-[#F1F1F1]', text: 'text-black' },
              { name: 'Off-White', hex: '#FAFAFA', bg: 'bg-[#FAFAFA]', text: 'text-black' },
              { name: 'White', hex: '#FFFFFF', bg: 'bg-[#FFFFFF]', text: 'text-black' },
            ].map((token) => (
              <div
                key={token.hex}
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-mono-border bg-mono-white text-xs font-mono"
              >
                <div className={`w-4 h-4 rounded border border-mono-border ${token.bg}`} />
                <span className="font-semibold text-mono-deepblack">{token.name}</span>
                <span className="text-mono-medium text-[10px]">{token.hex}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

