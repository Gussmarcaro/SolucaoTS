import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@/shared/errors';

/** Compara nomes de grupo ignorando acento, caixa e espaços nas pontas. */
function normalizar(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Restringe a rota aos grupos informados.
 *
 * Esta é a proteção de verdade: esconder o item no menu é conveniência de
 * interface e não impede ninguém de chamar a rota direto. Use sempre em par —
 * o menu some **e** a rota barra.
 */
export function exigirGrupo(...grupos: string[]) {
  const permitidos = new Set(grupos.map(normalizar));

  return (req: Request, _res: Response, next: NextFunction) => {
    const grupo = req.usuario?.grupo;

    if (!grupo || !permitidos.has(normalizar(grupo))) {
      return next(
        new AppError(
          `Acesso restrito aos grupos: ${grupos.join(', ')}.`,
          403,
          'ACESSO_NEGADO',
        ),
      );
    }
    return next();
  };
}
