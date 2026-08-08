import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * JSON Schemas oficiais do Audesp (Fase V), publicados pelo TCESP em
 * "AUDESP - Repasses ao Terceiro Setor - JSON/Schemas".
 *
 * São a validação **estrutural** aplicada no momento do envio: documento fora
 * do schema é rejeitado antes mesmo das regras de negócio. Por isso os
 * versionamos e validamos localmente antes de transmitir.
 *
 * Ao atualizar: substitua os .json, ajuste `VERSAO_SCHEMA` e rode
 * `npm run dominios:fase-v` para regerar as tabelas de domínio.
 */

export const VERSAO_SCHEMA = 'v1_14';

export const SCHEMAS_DIR = dirname(fileURLToPath(import.meta.url));

/** Tipos de ajuste, no nome usado pelos arquivos de schema. */
export const TIPOS_AJUSTE = [
  'contrato_gestao',
  'convenio',
  'termo_colaboracao',
  'termo_fomento',
  'termo_parceria',
] as const;

export type TipoAjusteSchema = (typeof TIPOS_AJUSTE)[number];

/** Converte o enum `TipoAjuste` do Prisma no nome usado pelos schemas. */
const POR_ENUM: Record<string, TipoAjusteSchema> = {
  CONTRATO_GESTAO: 'contrato_gestao',
  CONVENIO: 'convenio',
  TERMO_COLABORACAO: 'termo_colaboracao',
  TERMO_FOMENTO: 'termo_fomento',
  TERMO_PARCERIA: 'termo_parceria',
};

export function tipoAjusteSchema(tipoAjuste: string): TipoAjusteSchema | null {
  return POR_ENUM[tipoAjuste] ?? null;
}

export function arquivoSchema(tipo: TipoAjusteSchema): string {
  return resolve(SCHEMAS_DIR, `prestacao_contas_${tipo}_schema_${VERSAO_SCHEMA}.json`);
}

export function arquivoSchemaDeclaracaoNegativa(): string {
  return resolve(SCHEMAS_DIR, `declaracao_negativa_schema_${VERSAO_SCHEMA}.json`);
}
