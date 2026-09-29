import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, Copy, RefreshCw, FileText, Trash2, Bot, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '../api';
import { Modal, Spinner } from '../components/ui';

export default function Chat() {
  const api = useApi();
  const nav = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const docId = sp.get('doc');
  const [convs, setConvs] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [src, setSrc] = useState(null);
  const [showList, setShowList] = useState(false);
  const end = useRef();
  const suffix = docId ? `?doc=${docId}` : '';

  const loadConvs = () => api('/conversations').then(setConvs).catch(() => {});
  useEffect(() => { loadConvs(); }, []); // eslint-disable-line
  useEffect(() => {
    if (loading) return;
    if (id) api(`/conversations/${id}`).then((d) => setMsgs(d.messages)).catch((e) => toast.error(e.message));
    else setMsgs([]);
  }, [id]); // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  async function send(question, regenerate = false) {
    if (!question.trim() || loading) return;
    setMsgs((m) => (regenerate ? m.slice(0, -1) : [...m, { role: 'user', content: question }]));
    setInput('');
    setLoading(true);
    try {
      const d = await api('/chat', { method: 'POST', body: { conversationId: id, question, regenerate, documentIds: docId ? [docId] : undefined } });
      setMsgs((m) => [...m, { role: 'assistant', content: d.answer, sources: d.sources }]);
      if (!id) nav(`/app/chat/${d.conversationId}${suffix}`, { replace: true });
      loadConvs();
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  }
  async function del(cid) {
    try { await api(`/conversations/${cid}`, { method: 'DELETE' }); if (cid === id) nav('/app/chat' + suffix); loadConvs(); }
    catch (e) { toast.error(e.message); }
  }
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user');

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4">
      <aside className={`${showList ? 'fixed inset-0 z-40 bg-white p-4' : 'hidden'} w-full shrink-0 flex-col md:relative md:flex md:w-56 md:p-0 md:z-auto`}>
        <div className="mb-2 flex gap-2">
          <Link to={'/app/chat' + suffix} onClick={() => setShowList(false)} className="btn-primary flex-1"><Plus size={16} />New chat</Link>
          <button className="btn-ghost md:hidden" onClick={() => setShowList(false)}><X size={16} /></button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {convs.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-lg px-2 py-1.5 text-sm ${c.id === id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-100'}`}>
              <Link to={`/app/chat/${c.id}${suffix}`} onClick={() => setShowList(false)} className="flex-1 truncate">{c.title}</Link>
              <button onClick={() => del(c.id)} aria-label="Delete chat" className="text-slate-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={14} /></button>
            </div>
          ))}
          {convs.length === 0 && <p className="px-2 text-sm text-slate-500">No conversations yet.</p>}
        </div>
      </aside>

      <section className="card flex min-w-0 flex-1 flex-col !p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm">
          <button className="font-medium md:hidden" onClick={() => setShowList(true)}>History</button>
          <span className="hidden font-medium md:block">Conversation</span>
          {docId && <Link to="/app/chat" className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">Scoped to one document <X size={12} /></Link>}
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {msgs.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <Bot size={32} className="mb-2 text-indigo-600" /><p className="font-medium text-slate-700">Ask anything about your documents</p>
              <p className="text-sm">Answers come only from your uploaded files.</p>
            </div>
          )}
          {msgs.map((m, i) => m.role === 'user' ? (
            <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl bg-indigo-600 px-4 py-2 text-sm text-white">{m.content}</div>
          ) : (
            <div key={i} className="max-w-[90%]">
              <div className="md rounded-2xl bg-slate-100 px-4 py-2 text-sm"><ReactMarkdown>{m.content}</ReactMarkdown></div>
              {m.sources?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.sources.map((s, j) => (
                    <button key={j} onClick={() => setSrc(s)} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-400">
                      <FileText size={12} />[{j + 1}] {s.name}{s.page ? ` · p.${s.page}` : ''}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-1 flex gap-3 text-slate-400">
                <button title="Copy" onClick={() => { navigator.clipboard.writeText(m.content); toast.success('Copied'); }}><Copy size={14} /></button>
                {i === msgs.length - 1 && lastUser && <button title="Regenerate" onClick={() => send(lastUser.content, true)}><RefreshCw size={14} /></button>}
              </div>
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner />Searching your documents…</div>}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-slate-100 p-3">
          <input className="input" placeholder="Ask anything about your documents…" value={input} maxLength={2000} onChange={(e) => setInput(e.target.value)} />
          <button className="btn-primary" disabled={loading || !input.trim()} aria-label="Send"><Send size={16} /></button>
        </form>
      </section>

      {src && (
        <Modal title={`${src.name}${src.page ? ` — page ${src.page}` : ''}`} onClose={() => setSrc(null)}>
          <p className="mb-2 text-xs text-slate-500">Chunk #{src.chunkIndex} · similarity {src.similarity}</p>
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{src.snippet}</p>
          <Link to={`/app/documents/${src.documentId}`} className="btn-ghost mt-4">Open document</Link>
        </Modal>
      )}
    </div>
  );
}
