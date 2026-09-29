import { Loader2, X } from 'lucide-react';

export const fmtBytes = (b = 0) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
export function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso)) / 1000));
  const u = [[86400, 'day'], [3600, 'hour'], [60, 'minute']].find(([n]) => s >= n);
  if (!u) return 'just now';
  const n = Math.floor(s / u[0]);
  return `${n} ${u[1]}${n > 1 ? 's' : ''} ago`;
}

export const Spinner = ({ className = '' }) => <Loader2 className={`animate-spin ${className}`} size={18} />;
export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;

const STATUS = {
  processing: 'bg-amber-50 text-amber-700', indexing: 'bg-blue-50 text-blue-700',
  ready: 'bg-emerald-50 text-emerald-700', failed: 'bg-red-50 text-red-700',
};
export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS[status] || STATUS.processing}`}>
    {(status === 'processing' || status === 'indexing') && <Spinner className="!h-3 !w-3" />}{status}
  </span>
);

export const Empty = ({ icon: Icon, title, text, children }) => (
  <div className="card flex flex-col items-center py-12 text-center">
    <div className="mb-3 rounded-full bg-indigo-50 p-3 text-indigo-600"><Icon size={24} /></div>
    <h3 className="font-semibold">{title}</h3>
    <p className="mb-4 mt-1 max-w-sm text-sm text-slate-500">{text}</p>
    {children}
  </div>
);

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
