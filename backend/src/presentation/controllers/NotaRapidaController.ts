import type { Request, Response, NextFunction } from 'express';
import { NotaRapidaUseCases } from '@/application/notaRapida/NotaRapidaUseCases';
import { PrismaNotaRapidaRepository } from '@/infrastructure/database/PrismaNotaRapidaRepository';

const casos = new NotaRapidaUseCases(new PrismaNotaRapidaRepository());

/**
 * O bloco de notas. O dono sai **sempre** do token (`req.usuario!.id`) — nunca
 * da URL ou do corpo —, como no Meu Perfil.
 */
export class NotaRapidaController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.usuario!.id));
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.usuario!.id, req.body?.texto ?? ''));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizar(req.usuario!.id, req.params.id, req.body?.texto));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.usuario!.id, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
