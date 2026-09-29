import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '../api';
import { Skeleton, StatusBadge, fmtBytes } from '../components/ui';

export default function DocumentDetail() {
  const { id } = useParams();
  const api = useApi();
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/documents/${id}`).then(setDoc).catch((e) => { setErr(e.message); toast.error(e.message); }); }, [api, id]);

  if (err) return <div className="card text-center text-slate-600">{err}. <Link to="/app/documents" className="text-indigo-600">Back to documents</Link></div>;
  if (!doc) return <Skeleton className="h-64" />;
  const info = [['Name', doc.name], ['Type', doc.file_type?.toUpperCase()], ['Size', fmtBytes(doc.file_size)],
    ['Uploaded', new Date(doc.created_at).toLocaleString()], ['Chunks', doc.chunk_count], ['Characters', doc.char_count?.toLocaleString()], ['Pages', doc.page_count]];
  return (
    <div className="space-y-5">
      <Link to="/app/documents" className="inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft size={14} />Documents</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-bold">Document information <StatusBadge status={doc.status} /></h1>
        {doc.status === 'ready' && <Link to={`/app/chat?doc=${doc.id}`} className="btn-primary"><MessageSquare size={16} />Chat with Document</Link>}
      </div>
      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {info.map(([l, v]) => <div key={l}><p className="text-xs text-slate-500">{l}</p><p className="break-words font-medium">{v ?? '—'}</p></div>)}
      </div>
      {doc.preview?.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Content preview</h2>
          {doc.preview.map((c) => <p key={c.chunk_index} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{c.content}</p>)}
        </div>
      )}
    </div>
  );
}
