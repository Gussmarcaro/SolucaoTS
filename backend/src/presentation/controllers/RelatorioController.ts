import type { Request, Response, NextFunction } from 'express';
import { RelatorioUseCases } from '@/application/relatorio/RelatorioUseCases';
import { PrismaRelatorioRepository } from '@/infrastructure/database/PrismaRelatorioRepository';

const casos = new RelatorioUseCases(new PrismaRelatorioRepository());

/** Filtros aceitos por todos os relatórios. */
const filtroDe = (req: Request) => ({
  ajusteId: req.query.ajusteId as string | undefined,
  ano: req.query.ano ? Number(req.query.ano) : undefined,
});

export class RelatorioController {
  async execucao(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.execucao(filtroDe(req)));
    } catch (e) {
      return next(e);
    }
  }

  async repasses(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.repasses(filtroDe(req)));
    } catch (e) {
      return next(e);
    }
  }

  async situacao(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.situacao(filtroDe(req)));
    } catch (e) {
      return next(e);
    }
  }
}
