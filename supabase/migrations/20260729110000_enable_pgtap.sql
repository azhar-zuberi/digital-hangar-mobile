-- Phase 6 of docs/clerk-migration-plan.md: enable pgTAP so RLS policies can
-- be tested directly at the SQL level (supabase/tests/database/) via
-- `supabase test db`, per the plan's stated preference for this over only
-- exercising RLS through the app — much faster loop, and the first real
-- regression test suite this project has for authorization. Harmless to
-- have installed outside of test runs; pgTAP adds no runtime behavior of
-- its own.
create extension if not exists pgtap with schema extensions;
