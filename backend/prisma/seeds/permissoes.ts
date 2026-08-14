/**
 * Semeia as permissões iniciais dos grupos existentes.
 *
 * Sem isto, ligar o gate trancaria todo mundo para fora — inclusive quem
 * precisaria entrar para configurar. Roda uma vez, e só concede a quem ainda
 * não tem nenhuma permissão: rodar de novo não desfaz configuração feita à mão.
 *
 *   npm run permissoes:seed
 */
import { PrismaClient } from '@prisma/client';
import { ACOES_DO_NIVEL, RECURSOS } from '../../src/core/permissao/Recurso';

const prisma = new PrismaClient();

const GRUPOS_ADMIN = ['administrador', 'suporte'];

const normalizar = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

async function main(): Promise<void> {
  const grupos = await prisma.grupoUsuario.findMany({
    select: { id: true, nome: true, _count: { select: { permissoes: true } } },
  });

  if (grupos.length === 0) {
    console.log('Nenhum grupo cadastrado — nada a semear.');
    return;
  }

  for (const grupo of grupos) {
    if (grupo._count.permissoes > 0) {
      console.log(`  ${grupo.nome.padEnd(20)} já tem permissões — preservado`);
      continue;
    }

    // Administração recebe tudo; os demais começam só com consulta. Ampliar
    // depois é uma decisão consciente na tela; começar amplo demais é um risco
    // que ninguém revisa.
    const ehAdmin = GRUPOS_ADMIN.includes(normalizar(grupo.nome));
    const nivel = ehAdmin ? 'TOTAL' : 'CONSULTA';

    const linhas: { grupoId: string; permissaoId: string }[] = [];
    for (const recurso of RECURSOS) {
      // Recursos restritos (auditoria, grupos) só para a administração.
      if (recurso.restrito && !ehAdmin) continue;

      const acoes = [...ACOES_DO_NIVEL[nivel]];
      if (recurso.temAprovacao && ehAdmin) acoes.push('APPROVE');

      for (const acao of acoes) {
        const permissao = await prisma.permissao.upsert({
          where: { modulo_acao: { modulo: recurso.id, acao } },
          update: {},
          create: { modulo: recurso.id, acao, descricao: `${acao} em ${recurso.rotulo}` },
          select: { id: true },
        });
        linhas.push({ grupoId: grupo.id, permissaoId: permissao.id });
      }
    }

    await prisma.grupoUsuarioPermissao.createMany({ data: linhas, skipDuplicates: true });
    console.log(`  ${grupo.nome.padEnd(20)} ${nivel.toLowerCase()} em ${linhas.length} permissões`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
