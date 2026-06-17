-- Human-readable property URLs: sites.slug unique per organization

alter table sites add column if not exists slug text;

update sites
set slug = trim(both '-' from lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g')))
where slug is null or slug = '';

-- Demo seed property
update sites
set slug = 'eri-plaza'
where id = '22222222-2222-2222-2222-222222222222';

-- Resolve duplicate slugs within the same org with numeric suffixes
with ranked as (
  select
    id,
    slug,
    row_number() over (
      partition by organization_id, slug
      order by created_at, id
    ) as rn
  from sites
  where slug is not null
)
update sites s
set slug = s.slug || '-' || (ranked.rn - 1)::text
from ranked
where s.id = ranked.id
  and ranked.rn > 1;

alter table sites alter column slug set not null;

create unique index if not exists sites_organization_slug_unique
  on sites (organization_id, slug);

create or replace function public.slugify_site_name(raw text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '-' from lower(regexp_replace(regexp_replace(trim(raw), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))),
      ''
    ),
    'property'
  );
$$;
