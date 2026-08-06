import type { Request, Response, NextFunction } from 'express';
import { ProgramaUseCases } from '@/application/programa/ProgramaUseCases';
import { PrismaProgramaRepository } from '@/infrastructure/database/PrismaProgramaRepository';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';

const casos = new ProgramaUseCases(new PrismaProgramaRepository(), new PrismaAjusteRepository());

export class ProgramaController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.ajusteId));
    } catch (e) {
      return next(e);
    }
  }

  async criarPrograma(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criarPrograma(req.params.ajusteId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizarPrograma(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizarPrograma(req.params.ajusteId, req.params.programaId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async excluirPrograma(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluirPrograma(req.params.ajusteId, req.params.programaId);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }

  async criarMeta(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criarMeta(req.params.ajusteId, req.params.programaId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizarMeta(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.atualizarMeta(req.params.ajusteId, req.params.programaId, req.params.metaId, req.body),
      );
    } catch (e) {
      return next(e);
    }
  }

  async excluirMeta(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluirMeta(req.params.ajusteId, req.params.programaId, req.params.metaId);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
