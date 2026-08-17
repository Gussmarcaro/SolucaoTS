import { PrismaClient } from '@prisma/client';
import { definirClienteAuditoria, extensaoAuditoria } from './extensaoAuditoria';
import { extensaoTenant } from './extensaoTenant';

/**
 * Instância única do Prisma Client compartilhada pela aplicação.
 *
 * Duas extensions, nesta ordem:
 * - **auditoria** preenche `criadoPor` e o órgão na criação, e grava a trilha
 *   de alterações e exclusões, lendo o contexto da requisição;
 * - **tenant** injeta o filtro por órgão em toda consulta às raízes.
 */
const base = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// A extension usa o client **sem** extensions para ler o estado anterior e
// gravar a trilha; sem isso a própria gravação passaria pela extension.
definirClienteAuditoria(base);

/*
 * A ordem importa. `$extends` empilha: a última aplicada é a mais externa, ou
 * seja, a primeira a ver a chamada. O tenant precisa vir por último para
 * filtrar **antes** de a auditoria ler o estado anterior do registro — do
 * contrário a trilha leria uma linha que a requisição não podia enxergar.
 */
export const prisma = base.$extends(extensaoAuditoria).$extends(extensaoTenant);
