-- Let everyone in without an email code.
-- Run once in the Supabase SQL editor.
--
-- 1. Activate every account that is still waiting for a confirmation
--    email, so people who signed up and never received the code can now
--    log in with the email and password they chose.
update auth.users
   set email_confirmed_at = now()
 where email_confirmed_at is null;

-- 2. Check: this should return 0.
select count(*) as still_waiting
  from auth.users
 where email_confirmed_at is null;

-- 3. Remove the one test account created while diagnosing sign-up.
delete from auth.users where email = 'compass-signup-test@example.com';
