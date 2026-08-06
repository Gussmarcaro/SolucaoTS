import type { Request, Response, NextFunction } from 'express';
import { PrestacaoUseCases } from '@/application/prestacao/PrestacaoUseCases';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';
import type { FiltrosPrestacao } from '@/application/prestacao/dtos';

const casos = new PrestacaoUseCases(new PrismaPrestacaoRepository(), new PrismaAjusteRepository());

export class PrestacaoController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.body));
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

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const filtros: FiltrosPrestacao = {
        status: q.status as string | undefined,
        ajusteId: q.ajusteId as string | undefined,
        ano: q.ano ? Number(q.ano) : undefined,
      };
      const resultado = await casos.listar({
        filtros,
        busca: q.busca as string | undefined,
        orderBy: q.orderBy as string | undefined,
        orderDir: q.orderDir as string | undefined,
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      });
      return res.json(resultado);
    } catch (e) {
      return next(e);
    }
  }
}
