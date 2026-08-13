import type { Request, Response, NextFunction } from 'express';
import { ListarAlertasUseCase } from '@/application/alerta/ListarAlertasUseCase';
import { PrismaAlertaRepository } from '@/infrastructure/database/PrismaAlertaRepository';

const listar = new ListarAlertasUseCase(new PrismaAlertaRepository());

export class AlertaController {
  /** `GET /alertas` — prazos e pendências calculados na hora. */
  async listar(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await listar.execute());
    } catch (e) {
      return next(e);
    }
  }
}
