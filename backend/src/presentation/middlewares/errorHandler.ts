import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '@/shared/errors';
import { normalizarRota, registrar } from '@/shared/log';
import { reportarErro } from '@/shared/monitoramento';

/** Middleware central de tratamento de erros. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // `AppError` é recusa prevista (senha errada, sem permissão, dado inválido).
  // Não vai para o log de erro: a linha da requisição já registra o 4xx, e
  // registrar de novo transformaria uso normal em ruído de investigação.
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

  /*
   * Erro não previsto: aqui é o único lugar que registra o stack.
   *
   * O id da requisição vai no log **e** na resposta. É o que transforma "não
   * funcionou ontem" em uma busca de um segundo: o usuário lê o código na tela
   * e você filtra por ele. Sem isso, resta perguntar se dá para reproduzir.
   */
  registrar('erro', 'erro-inesperado', {
    req: req.id,
    metodo: req.method,
    rota: normalizarRota(req.originalUrl.split('?')[0]),
    usuario: req.usuario?.id ?? null,
    orgao: req.usuario?.clienteId ?? null,
    erro: err instanceof Error ? err.message : String(err),
    tipo: err instanceof Error ? err.name : typeof err,
    // O corpo da requisição fica de fora de propósito: carregaria CPF, e-mail e
    // às vezes senha para dentro do log. Rota e identificadores bastam.
    stack: err instanceof Error ? err.stack?.split('\n').slice(0, 6).join('\n') : undefined,
  });

  // Mesmo erro, dois destinos e dois propósitos: o log responde "o que houve
  // nesta requisição", o agregador responde "isto é novo? atinge quantos
  // órgãos?" — e avisa sem depender de alguém estar lendo log.
  reportarErro(err, {
    req: req.id,
    rota: normalizarRota(req.originalUrl.split('?')[0]),
    orgao: req.usuario?.clienteId ?? null,
    usuario: req.usuario?.id ?? null,
  });

  return res.status(500).json({
    code: 'INTERNAL',
    message: 'Erro interno do servidor.',
    requisicaoId: req.id,
  });
}
