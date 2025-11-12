-- Create enum for user roles
create type public.app_role as enum ('talent', 'employer', 'admin');

-- Create enum for application status
create type public.application_status as enum ('pending', 'accepted', 'rejected', 'completed');

-- Create enum for transaction types
create type public.transaction_type as enum ('escrow', 'release', 'payout', 'refund');

-- Create enum for transaction status
create type public.transaction_status as enum ('pending', 'completed', 'failed', 'cancelled');

-- Create enum for job status
create type public.job_status as enum ('draft', 'open', 'in_progress', 'completed', 'cancelled');

-- User roles table (security definer pattern)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now() not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Profiles table for user information
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  phone_number text,
  full_name text not null,
  bio text,
  location text,
  skills jsonb default '[]'::jsonb,
  video_intro_url text,
  portfolio_links jsonb default '[]'::jsonb,
  id_verified boolean default false,
  rating numeric(3, 2) default 0,
  total_gigs_completed integer default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.profiles enable row level security;

-- Employer details table
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  company_name text not null,
  company_description text,
  website text,
  verified boolean default false,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.employers enable row level security;

-- Jobs/Gigs table
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references public.employers(id) on delete cascade not null,
  title text not null,
  description text not null,
  required_skills jsonb default '[]'::jsonb,
  budget_min numeric(10, 2) not null,
  budget_max numeric(10, 2) not null,
  milestones jsonb default '[]'::jsonb,
  status job_status default 'draft' not null,
  remote boolean default true,
  duration_days integer,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.jobs enable row level security;

-- Applications table
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade not null,
  applicant_id uuid references public.profiles(id) on delete cascade not null,
  proposal_text text not null,
  status application_status default 'pending' not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (job_id, applicant_id)
);

alter table public.applications enable row level security;

-- Wallets table
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  balance_minor_units bigint default 0 not null,
  currency text default 'USD' not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.wallets enable row level security;

-- Transactions table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references auth.users(id),
  to_user_id uuid references auth.users(id),
  job_id uuid references public.jobs(id),
  amount_minor_units bigint not null,
  currency text default 'USD' not null,
  type transaction_type not null,
  status transaction_status default 'pending' not null,
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.transactions enable row level security;

-- Security definer function to check user role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.employers
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.jobs
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.applications
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.wallets
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.transactions
  for each row execute function public.handle_updated_at();

-- RLS Policies

-- user_roles: only user can view their own roles, admins can manage
create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- profiles: users can view all, manage their own
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id);

-- employers: viewable by all, manageable by owner
create policy "Employers are viewable by everyone"
  on public.employers for select
  to authenticated
  using (true);

create policy "Users can create their employer profile"
  on public.employers for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their employer profile"
  on public.employers for update
  to authenticated
  using (auth.uid() = user_id);

-- jobs: viewable by all, manageable by employer
create policy "Jobs are viewable by everyone"
  on public.jobs for select
  to authenticated
  using (status = 'open' or exists (
    select 1 from public.employers where id = jobs.employer_id and user_id = auth.uid()
  ));

create policy "Employers can create jobs"
  on public.jobs for insert
  to authenticated
  with check (exists (
    select 1 from public.employers where id = employer_id and user_id = auth.uid()
  ));

create policy "Employers can update their jobs"
  on public.jobs for update
  to authenticated
  using (exists (
    select 1 from public.employers where id = employer_id and user_id = auth.uid()
  ));

-- applications: talent can view their own, employers can view for their jobs
create policy "Users can view their own applications"
  on public.applications for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = applicant_id and user_id = auth.uid())
    or exists (
      select 1 from public.jobs j
      join public.employers e on j.employer_id = e.id
      where j.id = job_id and e.user_id = auth.uid()
    )
  );

create policy "Talents can create applications"
  on public.applications for insert
  to authenticated
  with check (exists (
    select 1 from public.profiles where id = applicant_id and user_id = auth.uid()
  ));

create policy "Employers can update application status"
  on public.applications for update
  to authenticated
  using (exists (
    select 1 from public.jobs j
    join public.employers e on j.employer_id = e.id
    where j.id = job_id and e.user_id = auth.uid()
  ));

-- wallets: users can only view/manage their own
create policy "Users can view their own wallet"
  on public.wallets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own wallet"
  on public.wallets for insert
  to authenticated
  with check (auth.uid() = user_id);

-- transactions: users can view transactions they're involved in
create policy "Users can view their transactions"
  on public.transactions for select
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "System can create transactions"
  on public.transactions for insert
  to authenticated
  with check (true);

-- Indexes for performance
create index idx_profiles_user_id on public.profiles(user_id);
create index idx_employers_user_id on public.employers(user_id);
create index idx_jobs_employer_id on public.jobs(employer_id);
create index idx_jobs_status on public.jobs(status);
create index idx_applications_job_id on public.applications(job_id);
create index idx_applications_applicant_id on public.applications(applicant_id);
create index idx_transactions_from_user on public.transactions(from_user_id);
create index idx_transactions_to_user on public.transactions(to_user_id);
create index idx_wallets_user_id on public.wallets(user_id);