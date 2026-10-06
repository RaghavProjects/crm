-- Ram Prasad CRM — Step 2 schema
-- Requirements (the central record) and their line items, plus the status lookup.
-- Status vocabulary: the brief's seven states, kept as a lookup table so it can
-- change without a schema rewrite (brief vs spec conflict still open).

create extension if not exists "pgcrypto";

-- Status lookup ------------------------------------------------------------
create table if not exists requirement_status (
  code       text primary key,
  label      text not null,
  sort_order int  not null
);

insert into requirement_status (code, label, sort_order) values
  ('received',   'Received',   1),
  ('qualifying', 'Qualifying', 2),
  ('quoted',     'Quoted',     3),
  ('submitted',  'Submitted',  4),
  ('won',        'Won',        5),
  ('lost',       'Lost',       6),
  ('cancelled',  'Cancelled',  7)
on conflict (code) do update
  set label = excluded.label, sort_order = excluded.sort_order;

-- Requirement --------------------------------------------------------------
create table if not exists requirements (
  id                  uuid primary key default gen_random_uuid(),
  tender_ref          text not null,
  customer            text not null,
  project             text,
  source              text,
  submission_deadline date,
  status              text not null default 'received'
                        references requirement_status (code),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Up to 500 part numbers per requirement, many lines per requirement --------
create table if not exists requirement_lines (
  id               uuid primary key default gen_random_uuid(),
  requirement_id   uuid not null references requirements (id) on delete cascade,
  part_description text not null,
  client_part_no   text,
  oem_part_no      text,
  quantity         numeric,
  unit             text,
  delivery_required date,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists requirement_lines_requirement_id_idx
  on requirement_lines (requirement_id);

-- updated_at trigger -------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists requirements_set_updated_at on requirements;
create trigger requirements_set_updated_at
  before update on requirements
  for each row execute function set_updated_at();

-- OEM master (Step 3) ------------------------------------------------------
create table if not exists oems (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  location       text,
  spoc           text,               -- single point of contact
  mobile         text,
  email          text,
  gst_no         text,
  vendor_code    text,
  products       text,               -- products supplied
  capabilities   text,
  lead_time_days int,
  approved       boolean not null default false,
  commission_pct numeric,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists oems_set_updated_at on oems;
create trigger oems_set_updated_at
  before update on oems
  for each row execute function set_updated_at();

-- Sourcing: an OEM shortlisted against a requirement, plus request/response --
create table if not exists requirement_oems (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements (id) on delete cascade,
  oem_id         uuid not null references oems (id) on delete cascade,
  status         text not null default 'shortlisted',  -- shortlisted | requested | responded | declined
  requested_on   date,
  responded_on   date,
  request_notes  text,
  response_notes text,
  quoted_price   numeric,
  lead_time_days int,
  created_at     timestamptz not null default now(),
  unique (requirement_id, oem_id)
);

create index if not exists requirement_oems_requirement_id_idx
  on requirement_oems (requirement_id);

-- Quantity coverage (Step 4) -------------------------------------------------
-- Capacity is PER-ORDER (PRD Q1): an OEM's commitments here do not reduce what
-- it can offer on another requirement, so there is no cross-order subtraction.
-- A row is one firm commitment or one availability indication for a line item.
create table if not exists line_coverage (
  id            uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements (id) on delete cascade,
  line_id       uuid not null references requirement_lines (id) on delete cascade,
  oem_id        uuid not null references oems (id) on delete cascade,
  kind          text not null default 'firm',  -- firm | availability
  quantity      numeric not null check (quantity > 0),
  delivery_date date,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists line_coverage_line_id_idx on line_coverage (line_id);
create index if not exists line_coverage_requirement_id_idx
  on line_coverage (requirement_id);
