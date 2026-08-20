import type { Request, Response, NextFunction } from 'express';
import { CompromissoUseCases } from '@/application/compromisso/CompromissoUseCases';
import { PrismaCompromissoRepository } from '@/infrastructure/database/PrismaCompromissoRepository';
import { BusinessError } from '@/shared/errors';

const casos = new CompromissoUseCases(new PrismaCompromissoRepository());

const flag = (v: unknown) => v === 'true' || v === true;

export class CompromissoController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizar(req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.buscar(req.params.id));
    } catch (e) {
      return next(e);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      return res.json(
        await casos.listar({
          filtros: {
            tipo: q.tipo,
            status: q.status,
            ajusteId: q.ajusteId,
            responsavelId: q.responsavelId === 'eu' ? req.usuario?.id : q.responsavelId,
            de: q.de,
            ate: q.ate,
            pendentesDeRegistro: flag(q.pendentesDeRegistro),
          },
          busca: q.busca as string | undefined,
          page: q.page ? Number(q.page) : undefined,
          pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  async resumo(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.resumo());
    } catch (e) {
      return next(e);
    }
  }

  async definirStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.body?.status;
      if (typeof status !== 'string') throw new BusinessError('Informe o campo "status".');
      return res.json(await casos.definirStatus(req.params.id, status));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
