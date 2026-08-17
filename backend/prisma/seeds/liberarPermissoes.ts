/**
 * Volta todos os grupos ao estado "nunca configurado" — ou seja, acesso a tudo.
 *
 * Saída de emergência para quem se trancou para fora: a matriz é o único lugar
 * de onde se reconfigura permissão, e sem acesso a ela não há caminho de volta
 * pela interface. Um comando explícito é melhor que uma exceção escondida no
 * código, que enfraqueceria o controle todos os dias para socorrer um.
 *
 *   npm run permissoes:liberar
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const { count } = await prisma.grupoUsuarioPermissao.deleteMany({});
  console.log(
    count === 0
      ? 'Nenhum grupo tinha permissão configurada — nada a fazer.'
      : `${count} concessão(ões) removida(s). Todos os grupos voltam a acessar tudo.`,
  );
  console.log('Reinicie a API (ou aguarde 30s) para o cache expirar.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
