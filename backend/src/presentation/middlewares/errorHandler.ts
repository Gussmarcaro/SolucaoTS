import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '@/shared/errors';

/** Middleware central de tratamento de erros. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ code: err.code, message: err.message });
  }

  // Violação de unicidade no banco (fallback da trava de duplicidade).
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const alvo = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'registro';
    const message = alvo.includes('documento')
      ? 'Este CPF/CNPJ já está cadastrado em nossa base de dados.'
      : `Já existe um registro com o mesmo ${alvo}.`;
    return res.status(409).json({ code: 'CONFLICT', message });
  }

  console.error('[erro-inesperado]', err);
  return res.status(500).json({ code: 'INTERNAL', message: 'Erro interno do servidor.' });
}
