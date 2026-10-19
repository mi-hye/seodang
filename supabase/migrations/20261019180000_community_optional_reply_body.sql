alter table public.community_replies
 drop constraint community_replies_body_check,
 add constraint community_replies_body_check check (char_length(btrim(body)) <= 600),
 add constraint community_replies_content_check check (
  char_length(btrim(body)) > 0 or char_length(btrim(correction)) > 0
 );
