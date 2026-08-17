import type { Request, Response, NextFunction } from 'express';
import { ListarTransparenciaUseCase } from '@/application/transparencia/ListarTransparenciaUseCase';
import { PrismaTransparenciaRepository } from '@/infrastructure/database/PrismaTransparenciaRepository';

const casos = new ListarTransparenciaUseCase(new PrismaTransparenciaRepository());

export class TransparenciaController {
  /** `GET /transparencia` — parcerias e o que falta publicar em cada uma. */
  async listar(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.execute());
    } catch (e) {
      return next(e);
    }
  }
}
