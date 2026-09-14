import type { Request, Response, NextFunction } from 'express';
import { ConciliacaoUseCases } from '@/application/conciliacao/ConciliacaoUseCases';
import { PrismaConciliacaoRepository } from '@/infrastructure/database/PrismaConciliacaoRepository';
import { BusinessError } from '@/shared/errors';

const casos = new ConciliacaoUseCases(new PrismaConciliacaoRepository());

export class ConciliacaoController {
  async importar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BusinessError('Selecione o arquivo OFX do extrato.');
      return res.json(await casos.importar(req.file.buffer));
    } catch (e) {
      return next(e);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.listar({
          de: req.query.de as string | undefined,
          ate: req.query.ate as string | undefined,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  async conciliar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.conciliar(req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }
}
