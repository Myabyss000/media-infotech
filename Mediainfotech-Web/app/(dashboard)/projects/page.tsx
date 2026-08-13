'use client';

import React from 'react';
import { FolderGit2, Sparkles, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-2xl shadow-indigo-500/20">
          <FolderGit2 size={40} />
        </div>
        <span className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
          Coming Soon
        </span>
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-extrabold text-white">Project & Task Management</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          We are building a complete project workflow module with Kanban boards, site installation milestones, team assignments, and client deliverables.
        </p>
      </div>

      <div className="flex items-center space-x-3 text-xs text-slate-500 font-mono bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
        <Clock size={14} className="text-indigo-400" />
        <span>Module under active development</span>
      </div>

      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2 transition"
      >
        <ArrowLeft size={16} />
        <span>Return to Operations Dashboard</span>
      </Link>
    </div>
  );
}
