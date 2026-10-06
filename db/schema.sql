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

-- Auth, roles and audit (Step 5) --------------------------------------------
-- A profile per auth user, holding their role. New users default to 'sales';
-- the owner/management role is set by an administrator.
create table if not exists profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'sales',  -- owner | sales | operations | finance | admin
  created_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (user_id, email, role)
  values (new.id, new.email, 'sales')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Append-only audit trail: what, who, when.
create table if not exists audit_events (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  actor     text,
  entity    text not null,
  entity_id text,
  action    text not null,
  details   jsonb
);
revoke update, delete on audit_events from anon, authenticated;

-- Quotations (Step 6) --------------------------------------------------------
-- Every quotation comes from a requirement. Versioned; approved by a person.
create table if not exists quotes (
  id                uuid primary key default gen_random_uuid(),
  requirement_id    uuid not null references requirements (id) on delete cascade,
  version           int not null default 1,
  status            text not null default 'draft',   -- draft | approved
  target_margin_pct numeric,
  notes             text,
  approved_by       text,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (requirement_id, version)
);

drop trigger if exists quotes_set_updated_at on quotes;
create trigger quotes_set_updated_at
  before update on quotes
  for each row execute function set_updated_at();

create table if not exists quote_lines (
  id                uuid primary key default gen_random_uuid(),
  quote_id          uuid not null references quotes (id) on delete cascade,
  description       text not null,
  quantity          numeric,
  oem_price         numeric not null check (oem_price >= 0),
  lead_time_days    int,
  margin_pct        numeric,
  recommended_price numeric,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists quote_lines_quote_id_idx on quote_lines (quote_id);
create index if not exists quotes_requirement_id_idx on quotes (requirement_id);

-- Comparable past bids: quote lines joined to the requirement's outcome.
create or replace view past_bids as
select
  ql.id,
  ql.description,
  ql.oem_price,
  ql.recommended_price,
  ql.lead_time_days,
  q.requirement_id,
  r.tender_ref,
  r.customer,
  r.status as requirement_status
from quote_lines ql
join quotes q on q.id = ql.quote_id
join requirements r on r.id = q.requirement_id;

grant select on past_bids to authenticated;

-- Orders and POs (Step 7) ----------------------------------------------------
-- No orphan PO: quote_id is required, so an order can only exist from a quote.
-- The application additionally checks that the quote is approved.
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  requirement_id    uuid not null references requirements (id) on delete cascade,
  quote_id          uuid not null references quotes (id) on delete restrict,
  po_number         text not null,
  po_date           date,
  delivery_deadline date,
  oem_id            uuid references oems (id) on delete set null,
  supplier_po       text,
  pdi_required      boolean not null default false,
  notes             text,
  status            text not null default 'open',  -- open | completed | cancelled
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- One PO can have multiple invoices.
create table if not exists order_invoices (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  invoice_number text not null,
  invoice_date   date,
  amount         numeric check (amount >= 0),
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists orders_requirement_id_idx on orders (requirement_id);
create index if not exists order_invoices_order_id_idx on order_invoices (order_id);

-- Fulfilment, PDI and delivery (Step 8) -------------------------------------
create table if not exists order_fulfilment_steps (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders (id) on delete cascade,
  step          text not null,           -- oem_po, production_started, ...
  owner         text,
  expected_date date,
  completed_on  date,
  notes         text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (order_id, step)
);

-- PDI is quantified: offered / cleared / rejected, with a result.
create table if not exists order_pdi (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders (id) on delete cascade,
  inspected_on date,
  qty_offered  numeric check (qty_offered >= 0),
  qty_cleared  numeric check (qty_cleared >= 0),
  qty_rejected numeric check (qty_rejected >= 0),
  result       text not null default 'pending',  -- pending | passed | failed | held
  remarks      text,
  created_at   timestamptz not null default now()
);

-- Partial deliveries: many rows per order, outstanding balance is derived.
create table if not exists order_deliveries (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders (id) on delete cascade,
  delivered_on  date,
  qty_delivered numeric not null check (qty_delivered > 0),
  status        text not null default 'delivered',  -- in_transit | delivered
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists order_fulfilment_steps_order_id_idx
  on order_fulfilment_steps (order_id);
create index if not exists order_pdi_order_id_idx on order_pdi (order_id);
create index if not exists order_deliveries_order_id_idx
  on order_deliveries (order_id);

-- Documents, payments and commission (Step 9) -------------------------------
-- Document / compliance vault with expiry.
create table if not exists documents (
  id             uuid primary key default gen_random_uuid(),
  doc_type       text not null,   -- RFQ, drawing, compliance cert, quotation, PO, invoice, PDI report …
  title          text not null,
  supplier       text,            -- OEM / customer / internal
  doc_no         text,
  issue_date     date,
  expiry_date    date,
  requirement_id uuid references requirements (id) on delete set null,
  order_id       uuid references orders (id) on delete set null,
  product        text,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists documents_expiry_date_idx on documents (expiry_date);

-- Partial payments against an invoice.
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders (id) on delete cascade,
  invoice_id  uuid references order_invoices (id) on delete set null,
  amount      numeric not null check (amount > 0),
  paid_on     date,
  mode        text,             -- RTGS / NEFT / wire …
  reference   text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists payments_order_id_idx on payments (order_id);

-- Commission. PROVISIONAL (PRD Q2 open): the brief says commission is earned on
-- an OEM-payment milestone. This models that, but the exact milestone/flow must
-- be confirmed with the client before it is trusted.
create table if not exists commission_entries (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders (id) on delete cascade,
  oem_id            uuid references oems (id) on delete set null,
  base_amount       numeric not null check (base_amount >= 0),
  commission_pct    numeric,
  commission_amount numeric,
  milestone         text not null default 'oem_payment_received',
  status            text not null default 'pending',  -- pending | earned | paid
  earned_on         date,
  notes             text,
  created_at        timestamptz not null default now()
);
create index if not exists commission_entries_order_id_idx
  on commission_entries (order_id);

-- Row Level Security: authenticated users may work; anon gets nothing.
-- The app's server side uses the secret key, which bypasses RLS; this protects
-- the publishable key if it is ever used from a browser.
do $$
declare t text;
begin
  for t in select unnest(array[
    'requirements','requirement_lines','oems','requirement_oems',
    'line_coverage','profiles','audit_events','requirement_status',
    'quotes','quote_lines','orders','order_invoices',
    'order_fulfilment_steps','order_pdi','order_deliveries',
    'documents','payments','commission_entries'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "authenticated all" on %I', t);
    execute format(
      'create policy "authenticated all" on %I for all to authenticated using (true) with check (true)',
      t);
  end loop;
end $$;
