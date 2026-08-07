import type { Request, Response, NextFunction } from 'express';
import { ContratoPrestacaoUseCases } from '@/application/contratoPrestacao/ContratoPrestacaoUseCases';
import { PrismaContratoPrestacaoRepository } from '@/infrastructure/database/PrismaContratoPrestacaoRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';

const casos = new ContratoPrestacaoUseCases(
  new PrismaContratoPrestacaoRepository(),
  new PrismaPrestacaoRepository(),
);

export class ContratoPrestacaoController {
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
