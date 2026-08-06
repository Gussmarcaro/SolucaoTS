import type { Request, Response, NextFunction } from 'express';
import { PagamentoUseCases } from '@/application/pagamento/PagamentoUseCases';
import { PrismaPagamentoRepository } from '@/infrastructure/database/PrismaPagamentoRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';

const casos = new PagamentoUseCases(
  new PrismaPagamentoRepository(),
  new PrismaPrestacaoRepository(),
);

export class PagamentoController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.params.prestacaoId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizar(req.params.prestacaoId, req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.params.prestacaoId, req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
