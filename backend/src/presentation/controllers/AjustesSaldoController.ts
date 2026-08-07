import type { Request, Response, NextFunction } from 'express';
import { AjustesSaldoUseCases } from '@/application/ajustesSaldo/AjustesSaldoUseCases';
import { PrismaAjustesSaldoRepository } from '@/infrastructure/database/PrismaAjustesSaldoRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';

const casos = new AjustesSaldoUseCases(new PrismaAjustesSaldoRepository(), new PrismaPrestacaoRepository());

export class AjustesSaldoController {
  async obter(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.obter(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async salvar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.salvar(req.params.prestacaoId, req.body ?? {}));
    } catch (e) {
      return next(e);
    }
  }
}
