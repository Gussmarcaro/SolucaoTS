import type { Request, Response, NextFunction } from 'express';
import { ReceitaUseCases } from '@/application/receita/ReceitaUseCases';
import { PrismaReceitaRepository } from '@/infrastructure/database/PrismaReceitaRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';

const casos = new ReceitaUseCases(new PrismaReceitaRepository(), new PrismaPrestacaoRepository());

export class ReceitaController {
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

  /** `GET .../candidatos` — o que a prestação pode apropriar. */
  async listarCandidatos(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarCandidatos(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async apropriar(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.apropriar(req.params.prestacaoId, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  async desapropriar(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.desapropriar(req.params.prestacaoId, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
