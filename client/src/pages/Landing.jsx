import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Brain, Search, MessageSquare, Quote, ShieldCheck, Cpu, Check } from 'lucide-react';

const features = [
  [Search, 'AI-powered search', 'Semantic search finds meaning, not just matching keywords.'],
  [MessageSquare, 'Document chat', 'Ask questions in plain language and get direct answers.'],
  [Quote, 'Source citations', 'Every answer links back to the file and page it came from.'],
  [ShieldCheck, 'Secure workspace', 'Your documents are only ever visible to you.'],
  [Cpu, 'Smart processing', 'PDF, DOCX and TXT files are parsed, chunked and indexed automatically.'],
];
const steps = [['Upload', 'Drop in PDF, DOCX or TXT files.'], ['Process', 'We extract and clean the text.'], ['Ask', 'Type a question about your files.'], ['Understand', 'Read a grounded answer with sources.']];
const plans = [['Free', '$0', ['20 documents', '10 MB per file', 'Unlimited chat']], ['Pro', '$12/mo', ['Unlimited documents', '50 MB per file', 'Priority processing']]];

export default function Landing() {
  return (
    <div className="bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 text-lg font-bold"><Brain className="text-indigo-600" />DocuMind AI</span>
          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#features">Features</a><a href="#how">How it Works</a><a href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <SignedOut>
              <Link to="/sign-in" className="btn text-slate-700">Login</Link>
              <Link to="/sign-up" className="btn-primary">Get Started</Link>
            </SignedOut>
            <SignedIn><Link to="/app" className="btn-primary">Open dashboard</Link></SignedIn>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">Talk to your documents with AI.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">Upload your documents, ask questions, and get intelligent answers grounded in your own knowledge.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/sign-up" className="btn-primary px-6 py-3">Get Started</Link>
          <a href="#how" className="btn-ghost px-6 py-3">See How It Works</a>
        </div>
        <div className="mx-auto mt-14 max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm shadow-sm">
          <p className="ml-auto w-fit rounded-lg bg-indigo-600 px-3 py-2 text-white">Explain overfitting.</p>
          <p className="mt-3 rounded-lg bg-white p-3">Overfitting occurs when a model learns noise in the training data and fails on new data [1].</p>
          <p className="mt-2 text-xs text-slate-500">Source: ML_Notes.pdf, page 12</p>
        </div>
      </section>

      <section id="features" className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([Icon, t, d]) => (
            <div key={t} className="card"><Icon className="mb-3 text-indigo-600" /><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, d], i) => (
            <div key={t}><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">{i + 1}</div><h3 className="font-semibold">{t}</h3><p className="text-sm text-slate-600">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-3xl gap-4 px-4 sm:grid-cols-2">
          {plans.map(([n, p, items]) => (
            <div key={n} className="card"><h3 className="font-semibold">{n}</h3><p className="my-2 text-3xl font-bold">{p}</p>
              {items.map((i) => <p key={i} className="flex items-center gap-2 text-sm text-slate-600"><Check size={14} className="text-emerald-600" />{i}</p>)}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold">Turn your documents into an intelligent knowledge base.</h2>
        <Link to="/sign-up" className="btn-primary mt-6 px-6 py-3">Get Started</Link>
      </section>
      <footer className="border-t border-slate-100 py-6 text-center text-sm text-slate-500">© DocuMind AI</footer>
    </div>
  );
}
