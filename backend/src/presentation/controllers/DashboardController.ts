import type { Request, Response, NextFunction } from 'express';
import { ContarCadastrosUseCase } from '@/application/dashboard/ContarCadastrosUseCase';
import {
  PermissoesLeitor,
  PrismaContagemRepository,
} from '@/infrastructure/database/PrismaContagemRepository';

const casos = new ContarCadastrosUseCase(new PrismaContagemRepository(), new PermissoesLeitor());

export class DashboardController {
  /**
   * Contagem dos cadastros, numa requisição só.
   *
   * Substitui doze chamadas que a tela de entrada fazia — cada uma uma listagem
   * paginada da qual só se aproveitava o `total`. O grupo vem do token; quem
   * responde o que ele pode ver é o caso de uso, não esta camada.
   */
  async contagens(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ itens: await casos.execute(req.usuario?.grupo ?? null) });
    } catch (e) {
      return next(e);
    }
  }
}
