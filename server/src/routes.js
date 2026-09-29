import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getAuth } from '@clerk/express';
import rateLimit from 'express-rate-limit';
import { AppError, supabase, db, ingest, embed, llmAnswer } from './lib.js';

const r = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const MIN_SIM = Number(process.env.MIN_SIMILARITY || 0.2);
const FALLBACK = "I couldn't find enough information in your documents to answer this confidently.";
const isUuid = (s) => /^[0-9a-f-]{36}$/i.test(String(s));

r.use((req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.userId = userId;
  next();
});

// ---------- Documents ----------
r.get('/documents', wrap(async (req, res) => {
  res.json(db(await supabase.from('documents').select('*').eq('user_id', req.userId).order('created_at', { ascending: false })));
}));

r.get('/documents/:id', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) throw new AppError(404, 'Document not found');
  const doc = db(await supabase.from('documents').select('*').eq('id', req.params.id).eq('user_id', req.userId).maybeSingle());
  if (!doc) throw new AppError(404, 'Document not found');
  const chunks = db(await supabase.from('document_chunks').select('chunk_index,content,metadata')
    .eq('document_id', doc.id).order('chunk_index').limit(5));
  res.json({ ...doc, preview: chunks });
}));

r.delete('/documents/:id', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) throw new AppError(404, 'Document not found');
  db(await supabase.from('documents').delete().eq('id', req.params.id).eq('user_id', req.userId));
  res.json({ ok: true });
}));

const uploadLimiter = rateLimit({ windowMs: 60_000, limit: 15 });
r.post('/documents/upload', uploadLimiter, upload.single('file'), wrap(async (req, res) => {
  const file = req.file;
  if (!file) throw new AppError(400, 'No file uploaded.');
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!['pdf', 'txt', 'docx'].includes(ext)) throw new AppError(400, 'Unsupported file type. Upload a PDF, TXT or DOCX.');
  if (!file.size) throw new AppError(400, 'The file is empty.');
  const safeName = path.basename(file.originalname).replace(/[^\w.\- ]/g, '_').slice(0, 200);
  const doc = db(await supabase.from('documents').insert({
    user_id: req.userId, name: safeName, file_name: safeName, file_type: ext, file_size: file.size, status: 'processing',
  }).select().single());
  res.status(202).json(doc);
  processDocument(doc.id, req.userId, file); // background
}));

async function processDocument(id, userId, file) {
  const setDoc = (patch) => supabase.from('documents').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  try {
    const { chunks, pages, chars } = await ingest(file);
    await setDoc({ status: 'indexing' });
    for (let i = 0; i < chunks.length; i += 50) {
      const rows = chunks.slice(i, i + 50).map((c, j) => ({
        document_id: id, user_id: userId, content: c.content, embedding: c.embedding,
        chunk_index: i + j, metadata: { page: c.page },
      }));
      db(await supabase.from('document_chunks').insert(rows));
    }
    await setDoc({ status: 'ready', page_count: pages, char_count: chars, chunk_count: chunks.length, error: null });
  } catch (e) {
    console.error('Processing failed:', e.message);
    await setDoc({ status: 'failed', error: e instanceof AppError && e.status !== 500 ? e.message : 'Processing failed. Please try again.' });
  }
}

// ---------- Search ----------
r.get('/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (!q) return res.json([]);
  const [emb] = await embed([q]);
  const rows = db(await supabase.rpc('match_chunks', { query_embedding: emb, match_count: 8, uid: req.userId, doc_ids: null }));
  const names = await docNames(rows.map((x) => x.document_id));
  res.json(rows.filter((x) => x.similarity >= MIN_SIM).map((x) => toSource(x, names)));
}));

// ---------- Chat ----------
async function docNames(ids) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return {};
  const rows = db(await supabase.from('documents').select('id,name').in('id', uniq));
  return Object.fromEntries(rows.map((d) => [d.id, d.name]));
}
const toSource = (c, names) => ({
  documentId: c.document_id, name: names[c.document_id] || 'Document', page: c.metadata?.page ?? null,
  chunkIndex: c.chunk_index, snippet: c.content, similarity: Number(c.similarity.toFixed(3)),
});

const chatLimiter = rateLimit({ windowMs: 60_000, limit: 20 });
r.post('/chat', chatLimiter, wrap(async (req, res) => {
  const question = String(req.body.question || '').trim().slice(0, 2000);
  if (!question) throw new AppError(400, 'Please enter a question.');
  const regenerate = !!req.body.regenerate;
  let cid = req.body.conversationId;

  if (cid) {
    if (!isUuid(cid)) throw new AppError(404, 'Conversation not found');
    const conv = db(await supabase.from('conversations').select('id').eq('id', cid).eq('user_id', req.userId).maybeSingle());
    if (!conv) throw new AppError(404, 'Conversation not found');
  } else {
    cid = db(await supabase.from('conversations').insert({ user_id: req.userId, title: question.slice(0, 60) }).select('id').single()).id;
  }

  if (regenerate) {
    const last = db(await supabase.from('messages').select('id,role').eq('conversation_id', cid).order('created_at', { ascending: false }).limit(1));
    if (last[0]?.role === 'assistant') await supabase.from('messages').delete().eq('id', last[0].id);
  }
  let hist = db(await supabase.from('messages').select('role,content').eq('conversation_id', cid).order('created_at', { ascending: false }).limit(7));
  if (regenerate) hist = hist.slice(1);
  const history = hist.reverse().slice(-6);
  if (!regenerate) db(await supabase.from('messages').insert({ conversation_id: cid, role: 'user', content: question }));

  const docIds = Array.isArray(req.body.documentIds) ? req.body.documentIds.filter(isUuid) : [];
  const [qEmb] = await embed([question]);
  const found = db(await supabase.rpc('match_chunks', {
    query_embedding: qEmb, match_count: 6, uid: req.userId, doc_ids: docIds.length ? docIds : null,
  })).filter((c) => c.similarity >= MIN_SIM);

  let answer = FALLBACK, sources = [];
  if (found.length) {
    const names = await docNames(found.map((c) => c.document_id));
    sources = found.map((c) => toSource(c, names));
    const contexts = sources.map((s, i) => ({ label: i + 1, source: s.name, page: s.page, content: s.snippet }));
    answer = await llmAnswer(question, contexts, history);
    if (answer.includes("couldn't find enough information")) sources = [];
  }
  db(await supabase.from('messages').insert({ conversation_id: cid, role: 'assistant', content: answer, sources }));
  await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', cid);
  res.json({ conversationId: cid, answer, sources });
}));

r.get('/conversations', wrap(async (req, res) => {
  res.json(db(await supabase.from('conversations').select('id,title,updated_at').eq('user_id', req.userId).order('updated_at', { ascending: false }).limit(50)));
}));
r.get('/conversations/:id', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) throw new AppError(404, 'Conversation not found');
  const conv = db(await supabase.from('conversations').select('*').eq('id', req.params.id).eq('user_id', req.userId).maybeSingle());
  if (!conv) throw new AppError(404, 'Conversation not found');
  const messages = db(await supabase.from('messages').select('role,content,sources,created_at').eq('conversation_id', conv.id).order('created_at'));
  res.json({ ...conv, messages });
}));
r.delete('/conversations/:id', wrap(async (req, res) => {
  if (!isUuid(req.params.id)) throw new AppError(404, 'Conversation not found');
  db(await supabase.from('conversations').delete().eq('id', req.params.id).eq('user_id', req.userId));
  res.json({ ok: true });
}));

// ---------- Analytics ----------
r.get('/analytics', wrap(async (req, res) => {
  const docs = db(await supabase.from('documents').select('id,name,file_size,status,created_at').eq('user_id', req.userId));
  const convs = db(await supabase.from('conversations').select('id').eq('user_id', req.userId));
  const ids = convs.map((c) => c.id);
  const msgs = ids.length ? db(await supabase.from('messages').select('role,sources').in('conversation_id', ids)) : [];
  const usage = {};
  msgs.filter((m) => m.role === 'assistant').forEach((m) =>
    [...new Set((m.sources || []).map((s) => s.documentId))].forEach((d) => (usage[d] = (usage[d] || 0) + 1)));
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10);
    return { date: d.slice(5), key: d, count: 0 };
  });
  docs.forEach((d) => { const k = days.find((x) => x.key === d.created_at.slice(0, 10)); if (k) k.count++; });
  const statusCounts = {};
  docs.forEach((d) => (statusCounts[d.status] = (statusCounts[d.status] || 0) + 1));
  res.json({
    totals: { documents: docs.length, conversations: convs.length, questions: msgs.filter((m) => m.role === 'user').length,
      storageBytes: docs.reduce((a, d) => a + Number(d.file_size || 0), 0) },
    uploadsByDay: days.map(({ date, count }) => ({ date, count })),
    statusCounts: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
    topDocuments: docs.filter((d) => usage[d.id]).map((d) => ({ name: d.name, count: usage[d.id] })).sort((a, b) => b.count - a.count).slice(0, 5),
  });
}));

export default r;
