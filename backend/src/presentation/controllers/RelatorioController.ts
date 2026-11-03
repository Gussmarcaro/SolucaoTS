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

  async fornecedores(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.fornecedores(filtroDe(req)));
    } catch (e) {
      return next(e);
    }
  }

  /**
   * Os três quadros de despesa do período.
   *
   * Pede **período**, e não ano: é o relatório de fechamento que a entidade
   * monta todo mês. O caso de uso recusa período ausente ou invertido — sem
   * ele a consulta varreria o órgão inteiro.
   */
  async despesas(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.despesas({
          de: String(req.query.de ?? ''),
          ate: String(req.query.ate ?? ''),
          ajusteId: (req.query.ajusteId as string | undefined) || undefined,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }
}
