-- Run in Supabase SQL editor
create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  file_name text,
  file_type text,
  file_size bigint default 0,
  storage_path text,
  status text not null default 'processing', -- processing | indexing | ready | failed
  error text,
  page_count int default 0,
  char_count int default 0,
  chunk_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id text not null,
  content text not null,
  embedding vector(768),
  chunk_index int,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  sources jsonb default '[]',
  created_at timestamptz default now()
);
create index if not exists idx_docs_user on documents(user_id);
create index if not exists idx_chunks_doc on document_chunks(document_id);
create index if not exists idx_chunks_user on document_chunks(user_id);
create index if not exists idx_chunks_vec on document_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists idx_conv_user on conversations(user_id);
create index if not exists idx_msg_conv on messages(conversation_id);

-- The API uses the service-role key and filters by user_id server-side.
-- Enabling RLS with no policies blocks all direct anon/browser access.
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create or replace function match_chunks(
  query_embedding vector(768), match_count int, uid text, doc_ids uuid[] default null
) returns table (id uuid, document_id uuid, content text, metadata jsonb, chunk_index int, similarity float)
language sql stable as $$
  select c.id, c.document_id, c.content, c.metadata, c.chunk_index,
         1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c
  where c.user_id = uid and (doc_ids is null or c.document_id = any(doc_ids))
  order by c.embedding <=> query_embedding
  limit match_count
$$;
