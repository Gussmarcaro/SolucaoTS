import type { Request, Response, NextFunction } from 'express';
import { TermoAditivoUseCases } from '@/application/termoAditivo/TermoAditivoUseCases';
import { PrismaTermoAditivoRepository } from '@/infrastructure/database/PrismaTermoAditivoRepository';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';

const casos = new TermoAditivoUseCases(
  new PrismaTermoAditivoRepository(),
  new PrismaAjusteRepository(),
);

export class TermoAditivoController {
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
