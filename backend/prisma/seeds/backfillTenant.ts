/**
 * Atribui um órgão aos registros que nasceram antes do isolamento multi-tenant.
 *
 * Roda **uma vez**, entre o `db:push` que criou as colunas e o aperto que as
 * torna obrigatórias. Antes dele ninguém tem órgão e nada é filtrado; depois
 * dele todo mundo tem, e o filtro passa a valer para todas as consultas.
 *
 * **Tudo numa transação, de propósito.** Preencher `Usuario.clienteId` antes
 * das demais raízes deixaria o sistema num estado pior que o inicial: o
 * `permissoesCache` resolve o grupo por nome passando pelo filtro, e grupo não
 * encontrado vira "nenhuma permissão configurada" — que **libera tudo**. Um
 * usuário com órgão cujo grupo ainda não tivesse órgão ganharia acesso total.
 * Ou vai tudo, ou não vai nada.
 *
 *   npm run tenant:backfill              # quando existe um único órgão
 *   npm run tenant:backfill -- <uuid>    # escolhendo o órgão explicitamente
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/** Raízes de tenant, lidas do schema — cadastro novo entra sozinho. */
const RAIZES = Prisma.dmmf.datamodel.models
  .filter((m) => m.fields.some((f) => f.name === 'clienteId'))
  .map((m) => m.name);

/** `Fornecedor` → `fornecedor`, para indexar o client. */
const delegate = (model: string) => model.charAt(0).toLowerCase() + model.slice(1);

async function escolherOrgao(informado?: string): Promise<{ id: string; nome: string }> {
  const orgaos = await prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } });

  if (orgaos.length === 0) {
    throw new Error('Nenhum órgão cadastrado. Cadastre o órgão antes de rodar o backfill.');
  }

  if (informado) {
    const achado = orgaos.find((o) => o.id === informado);
    if (!achado) throw new Error(`Órgão ${informado} não encontrado.`);
    return achado;
  }

  // Com mais de um órgão não há escolha óbvia, e adivinhar aqui significaria
  // entregar os dados de um cliente a outro. Melhor parar e pedir o id.
  if (orgaos.length > 1) {
    console.error('\nHá mais de um órgão cadastrado. Informe a qual deles os registros pertencem:\n');
    for (const o of orgaos) console.error(`  ${o.id}  ${o.nome}`);
    console.error('\n  npm run tenant:backfill -- <uuid>\n');
    throw new Error('Órgão não informado.');
  }

  return orgaos[0];
}

async function main(): Promise<void> {
  const orgao = await escolherOrgao(process.argv[2]);
  console.log(`\nÓrgão de destino: ${orgao.nome}\n  ${orgao.id}\n`);

  // Levantamento antes de escrever — assim dá para conferir o tamanho do
  // estrago potencial antes de causá-lo.
  const pendentes: { model: string; quantos: number }[] = [];
  for (const model of RAIZES) {
    const d = (prisma as unknown as Record<string, { count: (a: unknown) => Promise<number> }>)[delegate(model)];
    const quantos = await d.count({ where: { clienteId: null } });
    if (quantos > 0) pendentes.push({ model, quantos });
  }

  if (pendentes.length === 0) {
    console.log('Nenhum registro sem órgão. Nada a fazer.\n');
    return;
  }

  console.log('Registros sem órgão:');
  for (const p of pendentes) console.log(`  ${String(p.quantos).padStart(6)}  ${p.model}`);

  const total = pendentes.reduce((s, p) => s + p.quantos, 0);
  console.log(`\n  ${total} registro(s) em ${pendentes.length} tabela(s).\n`);

  await prisma.$transaction(
    pendentes.map(({ model }) =>
      (prisma as unknown as Record<string, { updateMany: (a: unknown) => Prisma.PrismaPromise<unknown> }>)[
        delegate(model)
      ].updateMany({ where: { clienteId: null }, data: { clienteId: orgao.id } }),
    ),
  );

  console.log('Feito — todos os registros pertencem ao órgão acima.');
  console.log('\nPróximos passos:');
  console.log('  1. Todos os usuários precisam sair e entrar de novo (o token leva o órgão).');
  console.log('  2. Só então aplique o aperto do schema (uniques compostos e colunas NOT NULL).\n');
}

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
