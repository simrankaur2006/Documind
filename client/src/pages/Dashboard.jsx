import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { FileText, MessageSquare, HelpCircle, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '../api';
import { Skeleton, StatusBadge, Empty, fmtBytes, timeAgo } from '../components/ui';

export default function Dashboard() {
  const api = useApi();
  const { user } = useUser();
  const [stats, setStats] = useState(null);
  const [docs, setDocs] = useState(null);

  useEffect(() => {
    api('/analytics').then(setStats).catch((e) => toast.error(e.message));
    api('/documents').then((d) => setDocs(d.slice(0, 5))).catch((e) => toast.error(e.message));
  }, [api]);

  const cards = stats && [
    ['Documents', stats.totals.documents, FileText], ['Conversations', stats.totals.conversations, MessageSquare],
    ['Questions asked', stats.totals.questions, HelpCircle], ['Storage used', fmtBytes(stats.totals.storageBytes), HardDrive],
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome back, {user?.firstName || 'there'}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards ? cards.map(([l, v, Icon]) => (
          <div key={l} className="card flex items-center gap-4">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600"><Icon size={20} /></div>
            <div><p className="text-2xl font-semibold">{v}</p><p className="text-sm text-slate-500">{l}</p></div>
          </div>
        )) : [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent documents</h2><Link to="/app/documents" className="text-sm text-indigo-600">View all</Link></div>
        {!docs ? <Skeleton className="h-32" /> : docs.length === 0 ? (
          <Empty icon={FileText} title="No documents yet" text="Upload your first document to start asking questions."><Link to="/app/documents" className="btn-primary">Upload a document</Link></Empty>
        ) : (
          <div className="card divide-y divide-slate-100 !p-0">
            {docs.map((d) => (
              <Link key={d.id} to={`/app/documents/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <div className="min-w-0"><p className="truncate font-medium">{d.name}</p><p className="text-xs text-slate-500">{fmtBytes(d.file_size)} · {timeAgo(d.created_at)}</p></div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
