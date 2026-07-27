-- ============================================================================
-- Solução TS — Tabela de Usuários (Cadastro)
-- Script de referência (o schema oficial é gerenciado pelo Prisma).
-- Gerar/aplicar via: npx prisma migrate dev --name usuario_cadastro
-- ============================================================================

-- Enum de tipo de documento (reaproveitado do domínio: CPF | CNPJ | RNE)
DO $$ BEGIN
  CREATE TYPE "TipoDocumento" AS ENUM ('CPF', 'CNPJ', 'RNE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Usuario" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clienteId"     UUID NULL REFERENCES "Cliente"("id"),
  "nome"          VARCHAR(255) NOT NULL,                -- Nome Completo / Razão Social
  "documento"     VARCHAR(14)  NOT NULL,                -- CPF (11) ou CNPJ (14), só dígitos
  "documentoTipo" "TipoDocumento" NOT NULL,
  "cep"           VARCHAR(8)   NOT NULL,
  "logradouro"    VARCHAR(255) NOT NULL,
  "bairro"        VARCHAR(255) NOT NULL,
  "cidade"        VARCHAR(255) NOT NULL,
  "uf"            VARCHAR(2)   NOT NULL,
  "email"         VARCHAR(255) NOT NULL,
  "celular"       VARCHAR(11)  NOT NULL,                -- DDD + número, só dígitos
  "senhaHash"           VARCHAR(255) NULL,               -- hash bcrypt da senha de login
  "resetTokenHash"      VARCHAR(64)  NULL,               -- SHA-256 do token de recuperação
  "resetTokenExpiresAt" TIMESTAMP    NULL,               -- validade do token
  "ativo"         BOOLEAN NOT NULL DEFAULT TRUE,
  "criadoEm"      TIMESTAMP NOT NULL DEFAULT now(),
  "atualizadoEm"  TIMESTAMP NOT NULL DEFAULT now()
);

-- Trava de duplicidade: o documento (CPF/CNPJ) é a chave de validação primária.
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_documento_key" ON "Usuario" ("documento");
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key"     ON "Usuario" ("email");
CREATE INDEX        IF NOT EXISTS "Usuario_cidade_idx"    ON "Usuario" ("cidade");
CREATE INDEX        IF NOT EXISTS "Usuario_uf_idx"        ON "Usuario" ("uf");
