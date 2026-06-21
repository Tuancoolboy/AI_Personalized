-- =====================================================================
-- AI Trợ Lý — Migration 0012: chat memory (conversations, messages, core context)
-- =====================================================================
-- Lưu hội thoại + trí nhớ dài hạn theo user và audience (employee | manager).
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

create table if not exists public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  audience    text not null check (audience in ('employee', 'manager')),
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.chat_conversations is 'Phiên chat trợ lý AI — mỗi user có thể có nhiều conversation theo audience';

create index if not exists chat_conversations_user_audience_updated_idx
  on public.chat_conversations (user_id, audience, updated_at desc);

create table if not exists public.chat_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.chat_conversations on delete cascade,
  user_id           uuid not null references auth.users on delete cascade,
  role              text not null check (role in ('user', 'assistant')),
  content           text not null,
  created_at        timestamptz not null default now()
);
comment on table public.chat_messages is 'Tin nhắn chat trợ lý AI — user-scoped qua conversation';

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at asc);

create table if not exists public.chat_memories (
  user_id       uuid not null references auth.users on delete cascade,
  audience      text not null check (audience in ('employee', 'manager')),
  core_context  text not null default '',
  updated_at    timestamptz not null default now(),
  primary key (user_id, audience)
);
comment on table public.chat_memories is 'Trí nhớ dài hạn (core context) tóm tắt sau mỗi cuộc hội thoại';

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_memories enable row level security;

-- chat_conversations
drop policy if exists chat_conversations_select_own on public.chat_conversations;
create policy chat_conversations_select_own on public.chat_conversations
  for select using (auth.uid() = user_id);

drop policy if exists chat_conversations_insert_own on public.chat_conversations;
create policy chat_conversations_insert_own on public.chat_conversations
  for insert with check (auth.uid() = user_id);

drop policy if exists chat_conversations_update_own on public.chat_conversations;
create policy chat_conversations_update_own on public.chat_conversations
  for update using (auth.uid() = user_id);

-- chat_messages
drop policy if exists chat_messages_select_own on public.chat_messages;
create policy chat_messages_select_own on public.chat_messages
  for select using (auth.uid() = user_id);

drop policy if exists chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own on public.chat_messages
  for insert with check (auth.uid() = user_id);

-- chat_memories
drop policy if exists chat_memories_select_own on public.chat_memories;
create policy chat_memories_select_own on public.chat_memories
  for select using (auth.uid() = user_id);

drop policy if exists chat_memories_insert_own on public.chat_memories;
create policy chat_memories_insert_own on public.chat_memories
  for insert with check (auth.uid() = user_id);

drop policy if exists chat_memories_update_own on public.chat_memories;
create policy chat_memories_update_own on public.chat_memories
  for update using (auth.uid() = user_id);
