-- =====================================================================
-- AI Trợ Lý — chat_conversations DELETE policy (user owns row)
-- =====================================================================

drop policy if exists chat_conversations_delete_own on public.chat_conversations;
create policy chat_conversations_delete_own on public.chat_conversations
  for delete using (auth.uid() = user_id);
