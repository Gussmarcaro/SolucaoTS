import type { Request, Response, NextFunction } from 'express';
import { MontarPrestacaoUseCase } from '@/application/montador/MontarPrestacaoUseCase';
import { PrismaMontadorRepository } from '@/infrastructure/database/PrismaMontadorRepository';
import { AjvValidadorSchema } from '@/infrastructure/tcesp/AjvValidadorSchema';
import { ConferirPrestacaoUseCase } from '@/application/montador/ConferirPrestacaoUseCase';

const casos = new MontarPrestacaoUseCase(new PrismaMontadorRepository(), new AjvValidadorSchema());
const conferencia = new ConferirPrestacaoUseCase(new PrismaMontadorRepository(), new AjvValidadorSchema());

export class MontadorController {
  /** O painel de pendências da prestação — ver ConferirPrestacaoUseCase. */
  async conferir(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await conferencia.execute(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async gerar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.execute(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }
}
