import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './prisma';
import { normalizarTexto } from '@/shared/normalizar';

/**
 * Carga das tabelas de domínio oficiais (CBO e Classificação Econômica da
 * Despesa) a partir dos arquivos versionados em `prisma/seeds/data/`.
 *
 * Esses arquivos são gerados das publicações originais em `Documentação/` por
 * `scripts/gerarDominios.ts` (`npm run dominios:gerar`); aqui só há carga.
 *
 * É idempotente: cada tabela é substituída por completo dentro de uma
 * transação. Nenhuma outra tabela as referencia por FK — os blocos guardam
 * apenas o código —, então a substituição é segura.
 */

const DADOS = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'prisma', 'seeds', 'data');

/** Exercício da tabela de classificação econômica presente em `data/`. */
const EXERCICIO = 2025;

/** Lê um arquivo NDJSON (um registro por linha) gerado pelo script. */
function lerNdjson<T>(nome: string): T[] {
  return readFileSync(resolve(DADOS, nome), 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as T);
}

type LinhaClassificacao = [
  string, string, string, string, string, string, string, string | null, string, string | null,
];

export async function seedDominios(): Promise<void> {
  const cbos = lerNdjson<[string, string]>('cbo.ndjson').map(([codigo, titulo]) => ({
    codigo,
    titulo,
    buscaTexto: `${codigo} ${normalizarTexto(titulo)}`,
  }));

  const classificacoes = lerNdjson<LinhaClassificacao>('classificacao-economica.ndjson').map(
    ([codigo, categoria, grupo, modalidade, elemento, subelemento, nome, escrituracao, entes, situacao]) => ({
      codigo,
      exercicio: EXERCICIO,
      categoria,
      grupo,
      modalidade,
      elemento,
      subelemento,
      nome,
      escrituracao,
      entes,
      situacao,
      buscaTexto: `${codigo} ${normalizarTexto(nome)}`,
    }),
  );

  const componentes = lerNdjson<[string, string, string]>('componentes-despesa.ndjson').map(
    ([tipo, codigo, nome]) => ({ tipo, codigo, nome, buscaTexto: `${codigo} ${normalizarTexto(nome)}` }),
  );

  await prisma.$transaction([
    prisma.cbo.deleteMany(),
    prisma.cbo.createMany({ data: cbos }),
    prisma.classificacaoEconomica.deleteMany({ where: { exercicio: EXERCICIO } }),
    prisma.classificacaoEconomica.createMany({ data: classificacoes }),
    prisma.componenteDespesa.deleteMany(),
    prisma.componenteDespesa.createMany({ data: componentes }),
  ]);

  console.log(
    `[dominios] carregados: ${cbos.length} CBO(s), ${classificacoes.length} classificação(ões) econômica(s) de ${EXERCICIO}, ${componentes.length} componente(s) de despesa.`,
  );
}

/**
 * Carrega as tabelas apenas se ainda estiverem vazias. Roda no startup para
 * que um ambiente novo (ex.: deploy no Render) fique utilizável sem passo
 * manual. Falha aqui não derruba a API.
 */
export async function seedDominiosSeVazio(): Promise<void> {
  try {
    const [cbos, classificacoes] = await Promise.all([
      prisma.cbo.count(),
      prisma.classificacaoEconomica.count({ where: { exercicio: EXERCICIO } }),
    ]);
    if (cbos > 0 && classificacoes > 0) return;
    console.log('[dominios] tabelas de domínio vazias — carregando...');
    await seedDominios();
  } catch (err) {
    console.error('[dominios] falha na carga (não crítico):', err);
  }
}
