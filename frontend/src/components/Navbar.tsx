import React from 'react';
import { HealthResponse } from '../types';

interface NavbarProps {
  health: HealthResponse | null;
  healthError: boolean;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, healthError }) => {
  return (
    <header className="w-full bg-white border-b border-slate-200/80 px-6 sm:px-12 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 select-none">
          <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            transcribe
          </span>
          <span className="text-xl font-bold text-indigo-600">/</span>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600 cursor-pointer hover:text-indigo-700 transition">
              Workspace
            </span>
            {health && (
              <span
                className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-500"
                title={`Engine: ${health.engine} (${health.model})`}
              />
            )}
            {healthError && (
              <span
                className="hidden sm:inline-block w-2 h-2 rounded-full bg-amber-400"
                title="API Offline (Running in interactive client mode)"
              />
            )}
          </div>
          <span className="hidden md:inline-block text-slate-400 font-normal">
            Audio to text, simplified.
          </span>
        </div>
      </div>
    </header>
  );
};
