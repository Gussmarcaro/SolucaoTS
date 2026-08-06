import type { Request, Response, NextFunction } from 'express';
import { EmpenhoUseCases } from '@/application/empenho/EmpenhoUseCases';
import { PrismaEmpenhoRepository } from '@/infrastructure/database/PrismaEmpenhoRepository';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';

const casos = new EmpenhoUseCases(new PrismaEmpenhoRepository(), new PrismaAjusteRepository());

export class EmpenhoController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.ajusteId));
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.params.ajusteId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizar(req.params.ajusteId, req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.params.ajusteId, req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
