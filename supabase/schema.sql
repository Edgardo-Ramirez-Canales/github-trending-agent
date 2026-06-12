-- ============================================================================
-- GitHub Trending Agent — Esquema Supabase
-- Ejecutar en: Dashboard → SQL Editor → New query → Run
-- Incluye: 3 tablas + columna user_id + Row Level Security (RLS) por dueño.
-- Login: GitHub OAuth (Supabase Auth) → auth.uid() identifica al usuario.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla: repos_vistos
-- ----------------------------------------------------------------------------
create table if not exists repos_vistos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null,                       -- ej: "vercel/next.js"
  fecha_vista timestamptz default now(),
  estrellas_al_verlo integer not null,
  umbral_reaparicion integer default 3000
);

create index if not exists idx_repos_vistos_user on repos_vistos(user_id);

alter table repos_vistos enable row level security;

create policy "repos_vistos: dueño lee" on repos_vistos
  for select using (auth.uid() = user_id);
create policy "repos_vistos: dueño inserta" on repos_vistos
  for insert with check (auth.uid() = user_id);
create policy "repos_vistos: dueño actualiza" on repos_vistos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "repos_vistos: dueño borra" on repos_vistos
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Tabla: contribuciones
-- ----------------------------------------------------------------------------
create table if not exists contribuciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  repo text not null,
  rama text,
  tipo_cambio text,                  -- 'features' | 'docs' | 'mercado' | 'codigo' | 'issue'
  modo text not null,                -- 'A' | 'B' | 'C'
  url_pr text,
  url_issue text,
  estado text default 'abierto',     -- 'abierto' | 'aceptado' | 'rechazado' | 'cancelado'
  categorias jsonb,                  -- array de categorías aplicadas
  fecha_creacion timestamptz default now(),
  fecha_actualizacion timestamptz default now()
);

create index if not exists idx_contribuciones_user on contribuciones(user_id);

alter table contribuciones enable row level security;

create policy "contribuciones: dueño lee" on contribuciones
  for select using (auth.uid() = user_id);
create policy "contribuciones: dueño inserta" on contribuciones
  for insert with check (auth.uid() = user_id);
create policy "contribuciones: dueño actualiza" on contribuciones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contribuciones: dueño borra" on contribuciones
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Tabla: notificaciones
-- ----------------------------------------------------------------------------
create table if not exists notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tipo text not null,                -- 'pr_aceptado' | 'pr_rechazado' | 'issue_respondido'
  mensaje text not null,
  repo text not null,
  url text,
  leida boolean default false,
  email_enviado boolean default false,
  fecha timestamptz default now()
);

create index if not exists idx_notificaciones_user on notificaciones(user_id);

alter table notificaciones enable row level security;

create policy "notificaciones: dueño lee" on notificaciones
  for select using (auth.uid() = user_id);
create policy "notificaciones: dueño inserta" on notificaciones
  for insert with check (auth.uid() = user_id);
create policy "notificaciones: dueño actualiza" on notificaciones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notificaciones: dueño borra" on notificaciones
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Trigger: mantener fecha_actualizacion al día en contribuciones
-- ----------------------------------------------------------------------------
create or replace function set_fecha_actualizacion()
returns trigger as $$
begin
  new.fecha_actualizacion = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_contribuciones_updated on contribuciones;
create trigger trg_contribuciones_updated
  before update on contribuciones
  for each row execute function set_fecha_actualizacion();
