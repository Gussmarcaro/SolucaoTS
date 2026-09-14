import type { Request, Response, NextFunction } from 'express';
import { ExecucaoPlanoUseCase } from '@/application/execucaoPlano/ExecucaoPlanoUseCase';
import { PrismaExecucaoPlanoRepository } from '@/infrastructure/database/PrismaExecucaoPlanoRepository';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';

const caso = new ExecucaoPlanoUseCase(
  new PrismaExecucaoPlanoRepository(),
  new PrismaAjusteRepository(),
);

export class ExecucaoPlanoController {
  /** `GET /ajustes/:ajusteId/execucao-plano?ano=` */
  async consultar(req: Request, res: Response, next: NextFunction) {
    try {
      const ano = Number(req.query.ano ?? new Date().getFullYear());
      return res.json(await caso.execute(req.params.ajusteId, ano));
    } catch (e) {
      return next(e);
    }
  }
}
