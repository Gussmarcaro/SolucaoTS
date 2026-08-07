import type { Request, Response, NextFunction } from 'express';
import { RepasseUseCases } from '@/application/repasse/RepasseUseCases';
import { PrismaRepasseRepository } from '@/infrastructure/database/PrismaRepasseRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { PrismaEmpenhoPrestacaoRepository } from '@/infrastructure/database/PrismaEmpenhoPrestacaoRepository';

const casos = new RepasseUseCases(
  new PrismaRepasseRepository(),
  new PrismaPrestacaoRepository(),
  new PrismaEmpenhoPrestacaoRepository(),
);

export class RepasseController {
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
