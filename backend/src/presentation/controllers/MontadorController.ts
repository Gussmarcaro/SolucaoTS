import type { Request, Response, NextFunction } from 'express';
import { MontarPrestacaoUseCase } from '@/application/montador/MontarPrestacaoUseCase';
import { PrismaMontadorRepository } from '@/infrastructure/database/PrismaMontadorRepository';
import { AjvValidadorSchema } from '@/infrastructure/tcesp/AjvValidadorSchema';

const casos = new MontarPrestacaoUseCase(new PrismaMontadorRepository(), new AjvValidadorSchema());

export class MontadorController {
  async gerar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.execute(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }
}
