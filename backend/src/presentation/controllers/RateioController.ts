import type { Request, Response, NextFunction } from 'express';
import { RateioUseCases } from '@/application/rateio/RateioUseCases';
import { PrismaRateioRepository } from '@/infrastructure/database/PrismaRateioRepository';
import { BusinessError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

const casos = new RateioUseCases(new PrismaRateioRepository());

export class RateioController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, unknown>;
      const page = Math.max(1, Number(q.page) || 1);
      const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 20));
      return res.json(
        await casos.listar({
          filtros: RateioUseCases.filtros(q),
          orderBy: typeof q.orderBy === 'string' ? q.orderBy : undefined,
          orderDir: q.orderDir === 'asc' ? 'asc' : 'desc',
          page,
          pageSize,
        }),
      );
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

  async definirAtivo(req: Request, res: Response, next: NextFunction) {
    try {
      const ativo = req.body?.ativo;
      if (typeof ativo !== 'boolean') throw new BusinessError('Informe o campo "ativo".');
      return res.json(await casos.definirAtivo(req.params.id, ativo));
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

  /** Ajustes vigentes numa data — alimenta o carregamento automático do quadro. */
  async ajustesVigentes(req: Request, res: Response, next: NextFunction) {
    try {
      const em = req.query.em;
      let data: Date;
      try {
        data = em ? parseDataISO(String(em)) : new Date();
      } catch {
        throw new BusinessError('Data inválida.');
      }
      return res.json(await casos.ajustesVigentes(data));
    } catch (e) {
      return next(e);
    }
  }
}
