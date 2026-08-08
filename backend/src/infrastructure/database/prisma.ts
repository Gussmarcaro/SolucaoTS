import { PrismaClient } from '@prisma/client';
import { definirClienteAuditoria, extensaoAuditoria } from './extensaoAuditoria';

/**
 * Instância única do Prisma Client compartilhada pela aplicação.
 *
 * A extension de auditoria preenche `criadoPor` e grava a trilha de alterações
 * e exclusões lendo o contexto da requisição — ver `extensaoAuditoria`.
 */
const base = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// A extension usa o client **sem** extensions para ler o estado anterior e
// gravar a trilha; sem isso a própria gravação passaria pela extension.
definirClienteAuditoria(base);

export const prisma = base.$extends(extensaoAuditoria);
