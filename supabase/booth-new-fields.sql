-- Lets interpreting rounds be saved for the three new fields:
-- religious, business and rights. If the field column has no list of
-- allowed values, nothing changes. Safe to run more than once.

do $$
declare
  c record;
  t regtype;
begin
  -- A check constraint that lists the allowed fields: add the new ones.
  for c in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.interpreting_rounds'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%''community''%'
      and pg_get_constraintdef(oid) not like '%''religious''%'
  loop
    execute format('alter table public.interpreting_rounds drop constraint %I', c.conname);
    execute format('alter table public.interpreting_rounds add constraint %I %s', c.conname,
      regexp_replace(c.def, '''community''::([a-z ]+)',
        '''community''::\1, ''religious''::\1, ''business''::\1, ''rights''::\1'));
  end loop;

  -- An enum type on the field column: add the new values.
  select atttypid::regtype into t
  from pg_attribute
  where attrelid = 'public.interpreting_rounds'::regclass and attname = 'field';
  if exists (select 1 from pg_type where oid = t and typtype = 'e') then
    execute format('alter type %s add value if not exists ''religious''', t);
    execute format('alter type %s add value if not exists ''business''', t);
    execute format('alter type %s add value if not exists ''rights''', t);
  end if;
end $$;
