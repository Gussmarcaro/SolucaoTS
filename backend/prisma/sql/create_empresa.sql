-- ============================================================================
-- Solução TS — Tabela de Empresas (Cadastro da Empresa / Contratante)
-- Script de referência (o schema oficial é gerenciado pelo Prisma).
-- Gerar/aplicar via: npx prisma migrate dev --name empresa_cadastro
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Empresa" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "razaoSocial"        VARCHAR(255) NOT NULL,
  "nomeFantasia"       VARCHAR(255) NULL,
  "cnpj"               VARCHAR(14)  NOT NULL,             -- só dígitos
  "inscricaoEstadual"  VARCHAR(20)  NULL,
  "inscricaoMunicipal" VARCHAR(20)  NULL,
  "cep"                VARCHAR(8)   NOT NULL,
  "logradouro"         VARCHAR(255) NOT NULL,
  "numero"             VARCHAR(20)  NULL,
  "complemento"        VARCHAR(255) NULL,
  "bairro"             VARCHAR(255) NOT NULL,
  "cidade"             VARCHAR(255) NOT NULL,
  "uf"                 VARCHAR(2)   NOT NULL,
  "email"              VARCHAR(255) NOT NULL,
  "telefoneFixo"       VARCHAR(11)  NULL,
  "whatsapp"           VARCHAR(11)  NULL,
  "ativo"              BOOLEAN NOT NULL DEFAULT TRUE,      -- soft delete
  "criadoEm"           TIMESTAMP NOT NULL DEFAULT now(),
  "atualizadoEm"       TIMESTAMP NOT NULL DEFAULT now()
);

-- Trava de duplicidade: CNPJ é único.
CREATE UNIQUE INDEX IF NOT EXISTS "Empresa_cnpj_key"   ON "Empresa" ("cnpj");
CREATE INDEX        IF NOT EXISTS "Empresa_cidade_idx" ON "Empresa" ("cidade");
CREATE INDEX        IF NOT EXISTS "Empresa_uf_idx"     ON "Empresa" ("uf");
CREATE INDEX        IF NOT EXISTS "Empresa_ativo_idx"  ON "Empresa" ("ativo");
