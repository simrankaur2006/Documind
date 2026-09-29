import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
export const db = (res) => {
  if (res.error) { console.error('DB error:', res.error.message); throw new AppError(500, 'Database error'); }
  return res.data;
};

const AI = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
async function callAI(path, init = {}) {
  let r;
  try {
    r = await fetch(AI + path, { ...init, headers: { 'x-api-key': process.env.AI_SERVICE_KEY || '', ...(init.headers || {}) } });
  } catch { throw new AppError(502, 'AI service is unreachable'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new AppError(r.status === 422 || r.status === 400 ? 422 : 502, typeof d.detail === 'string' ? d.detail : 'AI service error');
  return d;
}
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export async function ingest(file) {
  const form = new FormData();
  form.append('file', new Blob([file.buffer]), file.originalname);
  return callAI('/ingest', { method: 'POST', body: form });
}
export const embed = async (texts) => (await callAI('/embed', json({ texts }))).embeddings;
export const llmAnswer = async (question, contexts, history) =>
  (await callAI('/answer', json({ question, contexts, history }))).answer;
