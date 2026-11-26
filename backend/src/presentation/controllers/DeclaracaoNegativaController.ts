import type { Request, Response, NextFunction } from 'express';
import { NegativaAjusteUseCases } from '@/application/declaracaoNegativa/NegativaAjusteUseCases';
import { PrismaNegativaAjusteRepository } from '@/infrastructure/database/PrismaNegativaAjusteRepository';
import { tenantAtual } from '@/shared/contexto';

const ajustes = new NegativaAjusteUseCases(new PrismaNegativaAjusteRepository());

/** Declaração Negativa. O órgão vem sempre do token, nunca da entrada. */
export class DeclaracaoNegativaController {
  async painelAjustes(req: Request, res: Response, next: NextFunction) {
    try {
      const ano = Number(req.query.ano) || new Date().getUTCFullYear();
      return res.json(await ajustes.painel(tenantAtual(), ano));
    } catch (e) {
      return next(e);
    }
  }

  async painelPrestacao(req: Request, res: Response, next: NextFunction) {
    try {
      const ano = Number(req.query.ano) || new Date().getUTCFullYear() - 1;
      return res.json(await ajustes.painelPrestacao(tenantAtual(), ano));
    } catch (e) {
      return next(e);
    }
  }

  async marcarAjustes(req: Request, res: Response, next: NextFunction) {
    try {
      await ajustes.marcar(tenantAtual(), req.body ?? {});
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  async desmarcarAjuste(req: Request, res: Response, next: NextFunction) {
    try {
      await ajustes.desmarcar(tenantAtual(), req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
