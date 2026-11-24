import type { Request, Response, NextFunction } from 'express';
import { ContarCadastrosUseCase } from '@/application/dashboard/ContarCadastrosUseCase';
import { ContarPendenciasUseCase } from '@/application/dashboard/ContarPendenciasUseCase';
import { PrismaPendenciasRepository } from '@/infrastructure/database/PrismaPendenciasRepository';
import { tenantAtual } from '@/shared/contexto';
import {
  PermissoesLeitor,
  PrismaContagemRepository,
} from '@/infrastructure/database/PrismaContagemRepository';

const casos = new ContarCadastrosUseCase(new PrismaContagemRepository(), new PermissoesLeitor());
const pendencias = new ContarPendenciasUseCase(new PrismaPendenciasRepository(), new PermissoesLeitor());

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

  /**
   * O trabalho acumulado que os atalhos do Dashboard anunciam — extrato sem
   * conciliar, notas sem arquivo, pagamentos sem comprovante, prestações em
   * elaboração. Cada contagem é recortada pela permissão da tela a que leva.
   */
  async pendencias(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ itens: await pendencias.execute(req.usuario?.grupo ?? null, tenantAtual()) });
    } catch (e) {
      return next(e);
    }
  }
}
