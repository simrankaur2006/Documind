import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { LayoutDashboard, FileText, MessageSquare, BarChart3, Settings, Brain, Menu } from 'lucide-react';

const nav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/chat', label: 'Chat', icon: MessageSquare },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-200 bg-white p-4 transition-transform md:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <Link to="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold"><Brain className="text-indigo-600" />DocuMind AI</Link>
        <nav className="space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} />}
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
          <span className="hidden text-sm text-slate-500 md:block">Your knowledge workspace</span>
          <UserButton />
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
