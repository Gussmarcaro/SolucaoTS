/**
 * Entrada de linha de comando da carga das tabelas de domínio oficiais:
 *   npm run dominios:seed
 *
 * A lógica fica em `src/infrastructure/database/seedDominios.ts` (a API também
 * a executa no startup quando as tabelas estão vazias); aqui só há o wrapper
 * para rodar manualmente, ex.: depois de `npm run dominios:gerar` publicar uma
 * nova edição das tabelas.
 */
import { prisma } from '../../src/infrastructure/database/prisma';
import { seedDominios } from '../../src/infrastructure/database/seedDominios';

seedDominios()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
