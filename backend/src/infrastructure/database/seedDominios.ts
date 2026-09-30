import { readFileSync, readdirSync } from 'node:fs';
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

/**
 * Os arquivos de classificação disponíveis, com o exercício lido do nome.
 *
 * Ordenados do mais antigo para o mais novo só para o log ficar legível — a
 * carga é por exercício e a ordem não muda nada.
 */
function arquivosDeClassificacao(): { exercicio: number; arquivo: string }[] {
  return readdirSync(DADOS)
    .map((nome) => ({ nome, m: /^classificacao-economica-(\d{4})\.ndjson$/.exec(nome) }))
    .filter((x): x is { nome: string; m: RegExpExecArray } => !!x.m)
    .map((x) => ({ exercicio: Number(x.m[1]), arquivo: x.nome }))
    .sort((a, b) => a.exercicio - b.exercicio);
}

export async function seedDominios(): Promise<void> {
  const cbos = lerNdjson<[string, string]>('cbo.ndjson').map(([codigo, titulo]) => ({
    codigo,
    titulo,
    buscaTexto: `${codigo} ${normalizarTexto(titulo)}`,
  }));

  /*
   * Um arquivo por exercício, e o ano vem do **nome do arquivo**.
   *
   * A tabela vale por exercício (a PK é `exercicio + codigo`), e a prestação de
   * 2025 pode conter empenho de 2024 — a §17 #2 permite, na primeira prestação
   * do ajuste. Enquanto havia um arquivo só e um `EXERCICIO` constante,
   * acrescentar um ano exigia mexer no código do seed.
   *
   * Agora um exercício novo é **um arquivo novo**: o gerador o escreve, o seed
   * o encontra, e nada aqui muda.
   */
  const arquivosPorExercicio = arquivosDeClassificacao();
  const classificacoes = arquivosPorExercicio.flatMap(({ exercicio, arquivo }) =>
    lerNdjson<LinhaClassificacao>(arquivo).map(
      ([codigo, categoria, grupo, modalidade, elemento, subelemento, nome, escrituracao, entes, situacao]) => ({
        codigo,
        exercicio,
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
    ),
  );

  const componentes = lerNdjson<[string, string, string]>('componentes-despesa.ndjson').map(
    ([tipo, codigo, nome]) => ({ tipo, codigo, nome, buscaTexto: `${codigo} ${normalizarTexto(nome)}` }),
  );

  await prisma.$transaction([
    prisma.cbo.deleteMany(),
    prisma.cbo.createMany({ data: cbos }),
    // Só os exercícios que este seed traz: um ano carregado antes e removido
    // da pasta continuaria valendo, em vez de sumir do banco sem aviso.
    prisma.classificacaoEconomica.deleteMany({
      where: { exercicio: { in: arquivosPorExercicio.map((a) => a.exercicio) } },
    }),
    prisma.classificacaoEconomica.createMany({ data: classificacoes }),
    prisma.componenteDespesa.deleteMany(),
    prisma.componenteDespesa.createMany({ data: componentes }),
  ]);

  console.log(
    `[dominios] carregados: ${cbos.length} CBO(s), ${classificacoes.length} classificação(ões) econômica(s) de ${arquivosPorExercicio.map((a) => a.exercicio).join(", ")}, ${componentes.length} componente(s) de despesa.`,
  );
}

/**
 * Carrega as tabelas apenas se ainda estiverem vazias. Roda no startup para
 * que um ambiente novo (ex.: deploy no Render) fique utilizável sem passo
 * manual. Falha aqui não derruba a API.
 */
export async function seedDominiosSeVazio(): Promise<void> {
  try {
    /*
     * "Vazio" passou a significar **falta algum exercício**, não "não há nada".
     *
     * Enquanto a conferência era a contagem de um ano só, acrescentar um
     * exercício à pasta não bastava: no ambiente que já tinha 2025 carregado, o
     * seed saía cedo e o arquivo novo nunca entrava no banco. O defeito seria
     * silencioso — a tabela existe, a tela funciona, e só o código daquele ano
     * não é reconhecido.
     */
    const esperados = arquivosDeClassificacao().map((a) => a.exercicio);
    const [cbos, presentes] = await Promise.all([
      prisma.cbo.count(),
      prisma.classificacaoEconomica.findMany({
        where: { exercicio: { in: esperados } },
        distinct: ['exercicio'],
        select: { exercicio: true },
      }),
    ]);
    const faltando = esperados.filter((e) => !presentes.some((p) => p.exercicio === e));
    if (cbos > 0 && !faltando.length) return;
    console.log('[dominios] tabelas de domínio vazias — carregando...');
    await seedDominios();
  } catch (err) {
    console.error('[dominios] falha na carga (não crítico):', err);
  }
}
