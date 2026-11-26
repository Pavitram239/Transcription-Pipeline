import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <header className="w-full bg-white border-b border-slate-200/80 px-6 sm:px-12 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 select-none">
          <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            scribeflow
          </span>
          <span className="text-xl font-bold text-indigo-600">/</span>
        </div>
      </div>
    </header>
  );
};
