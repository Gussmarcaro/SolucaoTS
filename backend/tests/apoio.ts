import { execSync } from 'node:child_process';

/**
 * Apoio dos testes de integração.
 *
 * Estes testes precisam de um Postgres de verdade: o que eles provam é
 * justamente a ligação entre o token, o contexto da requisição, as extensions
 * do Prisma e o SQL que sai no fim. Com o banco mockado, sobraria o teste das
 * funções puras — que os `verificar:*` já fazem, sem banco nenhum.
 *
 * Sem `DATABASE_URL_TEST` a suíte **pula** em vez de falhar: quem clonou o
 * repositório para mexer no frontend não deve ver vermelho por não ter um
 * Postgres à mão.
 *
 *   DATABASE_URL_TEST="postgresql://...:5432/solucaots_test" npm test
 *
 * ATENÇÃO: o banco apontado é **truncado** a cada rodada. Nunca aponte para
 * produção — a variável é separada de `DATABASE_URL` exatamente por isso.
 */

export const URL_TESTE = process.env.DATABASE_URL_TEST;
export const TEM_BANCO = !!URL_TESTE;

/** Models que não são truncados: catálogo oficial, caro de recarregar. */
const PRESERVAR = new Set(['Cbo', 'ClassificacaoEconomica', 'ComponenteDespesa']);

/**
 * Prepara o ambiente antes de qualquer import da aplicação.
 *
 * A ordem importa: o `PrismaClient` lê `DATABASE_URL` no momento em que é
 * construído, e ele é construído no import de `prisma.ts`. Por isso os testes
 * importam a aplicação por `import()` dinâmico, depois desta chamada.
 */
export function prepararAmbiente(): void {
  process.env.DATABASE_URL = URL_TESTE;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET ??= 'segredo-de-teste';
  process.env.CORS_ORIGIN = '';
}

/** Aplica o schema no banco de teste (equivale ao que o deploy faz). */
export function aplicarSchema(): void {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: URL_TESTE },
    stdio: 'ignore',
  });
}

/** Esvazia tudo que a aplicação grava, preservando as tabelas de domínio. */
export async function limparBanco(prismaGlobal: {
  $executeRawUnsafe: (sql: string) => Promise<unknown>;
}): Promise<void> {
  const { Prisma } = await import('@prisma/client');
  const tabelas = Prisma.dmmf.datamodel.models
    .filter((m) => !PRESERVAR.has(m.name))
    .map((m) => `"${m.dbName ?? m.name}"`);
  // CASCADE resolve a ordem das chaves estrangeiras sozinho — listar 58
  // tabelas na ordem certa à mão seria uma lista a manter para sempre.
  await prismaGlobal.$executeRawUnsafe(`TRUNCATE ${tabelas.join(', ')} CASCADE`);
}

/** Dados de um órgão de teste, com o administrador dele. */
export function orgaoFake(n: number) {
  const d = String(n).padStart(2, '0');
  return {
    orgao: {
      nome: `PREFEITURA DE TESTE ${d}`,
      cnpj: `1234567800${d}99`.slice(0, 14).padEnd(14, '0'),
      codigoMunicipio: 1000 + n,
      codigoEntidade: 2000 + n,
      tipoOrgao: 'PREFEITURA_MUNICIPAL',
      periodicidade: 'QUADRIMESTRAL',
    },
    admin: {
      nome: `Administrador ${d}`,
      email: `admin${d}@teste.local`,
      documento: `1111111110${n}`.slice(0, 11).padEnd(11, '0'),
      senha: 'SenhaForte1!',
    },
  };
}
