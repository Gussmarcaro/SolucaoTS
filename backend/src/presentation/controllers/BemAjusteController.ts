import type { Request, Response, NextFunction } from 'express';
import { BemAjusteUseCases } from '@/application/bemAjuste/BemAjusteUseCases';
import { PrismaBemAjusteRepository } from '@/infrastructure/database/PrismaBemAjusteRepository';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';
import { BusinessError } from '@/shared/errors';

const casos = new BemAjusteUseCases(new PrismaBemAjusteRepository(), new PrismaAjusteRepository());

export class BemAjusteController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.ajusteId));
    } catch (e) {
      return next(e);
    }
  }

  async importar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BusinessError('Envie um arquivo .csv no campo "file".');
      const texto = req.file.buffer.toString('latin1');
      return res.json(await casos.importar(req.params.ajusteId, texto));
    } catch (e) {
      return next(e);
    }
  }

  async limpar(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.limpar(req.params.ajusteId);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
