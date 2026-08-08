import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@/shared/errors';
import { verificarToken } from '@/shared/auth/jwt';
import { comContexto } from '@/shared/contexto';

/** Usuário autenticado, anexado à requisição para uso nos controllers. */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}

/**
 * Exige um JWT válido e abre o contexto da requisição.
 *
 * O `next()` roda **dentro** do contexto, para que tudo que a requisição
 * dispara — inclusive a extension de auditoria, lá na camada de dados —
 * enxergue quem está operando.
 */
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.header('authorization') ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(cabecalho)?.[1]?.trim();

  if (!token) {
    return next(new AppError('Autenticação necessária.', 401, 'NAO_AUTENTICADO'));
  }

  let payload;
  try {
    payload = verificarToken(token);
  } catch {
    // Token adulterado ou expirado — o front trata 401 redirecionando ao login.
    return next(new AppError('Sessão expirada ou inválida. Entre novamente.', 401, 'NAO_AUTENTICADO'));
  }

  req.usuario = { id: payload.sub, nome: payload.nome, email: payload.email };

  comContexto(
    {
      usuarioId: payload.sub,
      usuarioNome: payload.nome,
      rota: `${req.method} ${req.baseUrl}${req.path}`,
    },
    next,
  );
}
