-- Applied 3 November 2026. The check allowed at most 9 marks, from when
-- there were nine trials; with sixteen, any member past nine could no
-- longer save. The cap is now far above the number of trials.
alter table public.members drop constraint if exists marks_earned_range;
alter table public.members add constraint marks_earned_range check (marks_earned >= 0 and marks_earned <= 500);
