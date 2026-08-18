/**
 * Concede ou revoga a marca de **suporte** — a equipe do fornecedor.
 *
 * Suporte é a única forma legítima de operar fora de um órgão: provisionar
 * clientes novos e atender um órgão específico trocando de contexto. Por isso
 * a concessão fica num comando explícito, fora da interface — quem administra
 * um órgão não pode se promover a fornecedor do sistema.
 *
 * O contrário — um grupo chamado "Suporte" — transformaria um cadastro livre
 * em fronteira de segurança: bastaria criar um grupo com esse nome.
 *
 *   npm run suporte:conceder -- fulano@empresa.com
 *   npm run suporte:revogar  -- fulano@empresa.com
 *   npm run suporte:listar
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listar(): Promise<void> {
  const equipe = await prisma.usuario.findMany({
    where: { suporte: true },
    select: { nome: true, email: true, ativo: true },
    orderBy: { nome: 'asc' },
  });

  if (equipe.length === 0) {
    console.log('\nNinguém tem a marca de suporte.\n');
    return;
  }
  console.log(`\n${equipe.length} usuário(s) com suporte:\n`);
  for (const u of equipe) console.log(`  ${u.ativo ? ' ' : '(inativo) '}${u.nome} — ${u.email}`);
  console.log();
}

async function definir(email: string, suporte: boolean): Promise<void> {
  const alvo = email.trim().toLowerCase();
  const usuario = await prisma.usuario.findUnique({
    where: { email: alvo },
    select: { id: true, nome: true, suporte: true },
  });
  if (!usuario) throw new Error(`Usuário ${alvo} não encontrado.`);

  if (usuario.suporte === suporte) {
    console.log(`\n${usuario.nome} já ${suporte ? 'tem' : 'não tem'} a marca de suporte.\n`);
    return;
  }

  await prisma.usuario.update({ where: { id: usuario.id }, data: { suporte } });
  console.log(`\n${usuario.nome}: suporte ${suporte ? 'concedido' : 'revogado'}.`);
  console.log('Precisa sair e entrar de novo — a marca vai no token.\n');
}

const acao = process.env.npm_lifecycle_event ?? '';
const email = process.argv[2];

const main = async () => {
  if (acao.endsWith('listar')) return listar();
  if (!email) throw new Error('Informe o e-mail do usuário.');
  return definir(email, acao.endsWith('conceder'));
};

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
