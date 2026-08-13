import type { Request, Response, NextFunction } from 'express';
import { RegistrarAcessoDadosUseCase } from '@/application/lgpd/RegistrarAcessoDadosUseCase';
import { PrismaAcessoDadosRepository } from '@/infrastructure/database/PrismaAcessoDadosRepository';

const registrarAcesso = new RegistrarAcessoDadosUseCase(new PrismaAcessoDadosRepository());

export class LgpdController {
  /**
   * `POST /lgpd/acesso-dados` — registra que a tela revelou dados pessoais.
   *
   * Aberta a qualquer usuário autenticado, ao contrário da consulta à trilha:
   * todo mundo pode gerar o registro do próprio acesso; ler o histórico é que
   * fica restrito a quem administra.
   */
  async acessoDados(req: Request, res: Response, next: NextFunction) {
    try {
      await registrarAcesso.execute({ entidade: req.body?.entidade, tela: req.body?.tela });
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
