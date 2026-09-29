import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, FileText, Trash2, MessageSquare, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '../api';
import { Skeleton, StatusBadge, Empty, Modal, Spinner, fmtBytes, timeAgo } from '../components/ui';

export default function Documents() {
  const api = useApi();
  const [docs, setDocs] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('new');
  const [toDelete, setToDelete] = useState(null);
  const [contentQ, setContentQ] = useState('');
  const [hits, setHits] = useState(null);
  const [searching, setSearching] = useState(false);
  const input = useRef();

  const load = useCallback(() => api('/documents').then(setDocs).catch((e) => toast.error(e.message)), [api]);
  useEffect(() => { load(); }, [load]);
  const pending = docs?.some((d) => d.status === 'processing' || d.status === 'indexing');
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [pending, load]);

  async function upload(files) {
    setUploading(true);
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      try { await api('/documents/upload', { method: 'POST', body: form }); toast.success(`Uploaded ${file.name}`); }
      catch (e) { toast.error(`${file.name}: ${e.message}`); }
    }
    setUploading(false);
    load();
  }
  async function remove() {
    try { await api(`/documents/${toDelete.id}`, { method: 'DELETE' }); toast.success('Document deleted'); setToDelete(null); load(); }
    catch (e) { toast.error(e.message); }
  }
  async function searchContent(e) {
    e.preventDefault();
    if (!contentQ.trim()) return setHits(null);
    setSearching(true);
    try { setHits(await api(`/search?q=${encodeURIComponent(contentQ)}`)); } catch (err) { toast.error(err.message); }
    setSearching(false);
  }

  const list = (docs || []).filter((d) => d.name.toLowerCase().includes(q.toLowerCase()) && (status === 'all' || d.status === status))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'size' ? b.file_size - a.file_size : new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Documents</h1>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload([...e.dataTransfer.files]); }}
        onClick={() => input.current.click()}
        className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400'}`}>
        {uploading ? <Spinner className="text-indigo-600" /> : <UploadCloud className="text-indigo-600" size={28} />}
        <p className="mt-2 font-medium">{uploading ? 'Uploading…' : 'Drag & drop files, or click to browse'}</p>
        <p className="text-sm text-slate-500">PDF, DOCX or TXT · up to 10 MB</p>
        <input ref={input} type="file" multiple hidden accept=".pdf,.txt,.docx" onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
      </div>

      <form onSubmit={searchContent} className="flex gap-2">
        <input className="input" placeholder="Search inside your documents (semantic search)…" value={contentQ} onChange={(e) => setContentQ(e.target.value)} />
        <button className="btn-ghost shrink-0" disabled={searching}>{searching ? <Spinner /> : <Search size={16} />}Search</button>
      </form>
      {hits && (
        <div className="card space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Search results</h3><button className="text-sm text-slate-500" onClick={() => setHits(null)}>Clear</button></div>
          {hits.length === 0 && <p className="text-sm text-slate-500">No matching passages found.</p>}
          {hits.map((h, i) => (
            <Link key={i} to={`/app/documents/${h.documentId}`} className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
              <p className="text-sm font-medium">{h.name}{h.page ? ` · page ${h.page}` : ''}</p>
              <p className="line-clamp-2 text-sm text-slate-600">{h.snippet}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Filter by name" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {['all', 'ready', 'processing', 'indexing', 'failed'].map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">Newest</option><option value="name">Name</option><option value="size">Size</option>
        </select>
      </div>

      {!docs ? <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        : list.length === 0 ? <Empty icon={FileText} title="No documents found" text="Upload a file above to build your knowledge base." />
        : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((d) => (
              <div key={d.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2"><FileText className="shrink-0 text-indigo-600" size={20} /><p className="truncate font-medium">{d.name}</p></div>
                  <StatusBadge status={d.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">{fmtBytes(d.file_size)} · Uploaded {timeAgo(d.created_at)}</p>
                {d.status === 'failed' && <p className="mt-1 text-sm text-red-600">{d.error}</p>}
                <div className="mt-4 flex gap-2">
                  <Link to={`/app/documents/${d.id}`} className="btn-ghost !py-1.5">Open</Link>
                  {d.status === 'ready' && <Link to={`/app/chat?doc=${d.id}`} className="btn-ghost !py-1.5"><MessageSquare size={14} />Chat</Link>}
                  <button onClick={() => setToDelete(d)} className="btn-ghost !py-1.5 text-red-600"><Trash2 size={14} />Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {toDelete && (
        <Modal title="Delete document?" onClose={() => setToDelete(null)}>
          <p className="text-sm text-slate-600">"{toDelete.name}" and its indexed content will be permanently removed.</p>
          <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setToDelete(null)}>Cancel</button><button className="btn bg-red-600 text-white hover:bg-red-700" onClick={remove}>Delete</button></div>
        </Modal>
      )}
    </div>
  );
}
