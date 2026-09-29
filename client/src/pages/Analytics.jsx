import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { useApi } from '../api';
import { Skeleton, fmtBytes } from '../components/ui';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const api = useApi();
  const [d, setD] = useState(null);
  useEffect(() => { api('/analytics').then(setD).catch((e) => toast.error(e.message)); }, [api]);
  if (!d) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[['Questions asked', d.totals.questions], ['Documents', d.totals.documents], ['Storage used', fmtBytes(d.totals.storageBytes)]].map(([l, v]) => (
          <div key={l} className="card"><p className="text-sm text-slate-500">{l}</p><p className="text-2xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Documents uploaded (last 14 days)</h2>
          <div className="h-64"><ResponsiveContainer><BarChart data={d.uploadsByDay}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Processing status</h2>
          {d.statusCounts.length === 0 ? <p className="text-sm text-slate-500">No documents yet.</p> : (
            <div className="h-64"><ResponsiveContainer><PieChart><Pie data={d.statusCounts} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>{d.statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % 4]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
          )}
        </div>
      </div>
      <div className="card">
        <h2 className="mb-3 font-semibold">Most used documents</h2>
        {d.topDocuments.length === 0 ? <p className="text-sm text-slate-500">Ask questions in Chat to see which documents are cited most.</p> : d.topDocuments.map((t) => (
          <div key={t.name} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0"><span className="truncate">{t.name}</span><span className="text-slate-500">{t.count} answers</span></div>
        ))}
      </div>
    </div>
  );
}
