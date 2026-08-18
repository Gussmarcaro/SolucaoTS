import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { normalizarRota, registrar } from '@/shared/log';

declare module 'express-serve-static-core' {
  interface Request {
    /** Id curto desta requisição — aparece no log e na resposta de erro 500. */
    id?: string;
  }
}

/** Rotas que não entram no log: ruído sem informação. */
const SILENCIOSAS = new Set(['/api/health']);

/**
 * Uma linha de log por requisição atendida.
 *
 * A linha é emitida no `finish` da resposta, e não na entrada, para carregar o
 * que só se sabe no fim: status, duração e — o que mais importa aqui — **qual
 * órgão** estava operando, que só existe depois de o `autenticar` ler o token.
 *
 * Num sistema multi-tenant esse campo é a diferença entre saber que algo falhou
 * e saber para quem falhou. Sem ele, o telefonema "não consegui salvar ontem"
 * continua sem resposta.
 */
export function registrarRequisicao(req: Request, res: Response, next: NextFunction) {
  req.id = randomUUID().slice(0, 8);
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    if (SILENCIOSAS.has(req.path)) return;

    const ms = Number((process.hrtime.bigint() - inicio) / 1_000_000n);
    // 5xx é problema nosso; 4xx é pedido recusado (senha errada, sem permissão),
    // que interessa acompanhar mas não é falha do sistema.
    const nivel = res.statusCode >= 500 ? 'erro' : res.statusCode >= 400 ? 'aviso' : 'info';

    registrar(nivel, 'requisicao', {
      req: req.id,
      metodo: req.method,
      rota: normalizarRota(req.originalUrl.split('?')[0]),
      status: res.statusCode,
      ms,
      usuario: req.usuario?.id ?? null,
      orgao: req.usuario?.clienteId ?? null,
    });
  });

  next();
}
