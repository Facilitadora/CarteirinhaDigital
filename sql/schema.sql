-- ============================================
-- ESQUEMA DO BANCO - Sistema de Treinamentos e Exames
-- Cole este script inteiro no Supabase: SQL Editor > New Query > Run
-- ============================================

-- Tabela de colaboradores
create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  matricula text not null unique,
  setor text not null,
  funcao text,
  ativo boolean default true,
  criado_em timestamp with time zone default now()
);

-- Tabela de treinamentos
create table treinamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references colaboradores(id) on delete cascade,
  nome text not null,              -- ex: "NR-35 Trabalho em Altura"
  data_realizacao date not null,
  data_validade date,              -- pode ser nulo se não tiver validade
  criado_em timestamp with time zone default now()
);

-- Tabela de exames periódicos
create table exames (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references colaboradores(id) on delete cascade,
  tipo text not null,               -- ex: "Exame Periódico", "Audiometria"
  data_realizacao date not null,
  data_validade date,
  criado_em timestamp with time zone default now()
);

-- Índices para buscas mais rápidas
create index idx_treinamentos_colaborador on treinamentos(colaborador_id);
create index idx_exames_colaborador on exames(colaborador_id);

-- ============================================
-- SEGURANÇA (Row Level Security)
-- Regra: qualquer pessoa pode LER (para o QR code público funcionar)
-- Regra: só usuários LOGADOS podem criar/editar/excluir
-- ============================================

alter table colaboradores enable row level security;
alter table treinamentos enable row level security;
alter table exames enable row level security;

-- Leitura pública (necessário para a ficha do QR code)
create policy "Leitura publica colaboradores" on colaboradores for select using (true);
create policy "Leitura publica treinamentos" on treinamentos for select using (true);
create policy "Leitura publica exames" on exames for select using (true);

-- Escrita somente para usuários autenticados (você e sua colega)
create policy "Escrita autenticada colaboradores" on colaboradores for insert with check (auth.role() = 'authenticated');
create policy "Update autenticado colaboradores" on colaboradores for update using (auth.role() = 'authenticated');
create policy "Delete autenticado colaboradores" on colaboradores for delete using (auth.role() = 'authenticated');

create policy "Escrita autenticada treinamentos" on treinamentos for insert with check (auth.role() = 'authenticated');
create policy "Update autenticado treinamentos" on treinamentos for update using (auth.role() = 'authenticated');
create policy "Delete autenticado treinamentos" on treinamentos for delete using (auth.role() = 'authenticated');

create policy "Escrita autenticada exames" on exames for insert with check (auth.role() = 'authenticated');
create policy "Update autenticado exames" on exames for update using (auth.role() = 'authenticated');
create policy "Delete autenticado exames" on exames for delete using (auth.role() = 'authenticated');
