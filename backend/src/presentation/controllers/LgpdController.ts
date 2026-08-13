import type { Request, Response, NextFunction } from 'express';
import { RegistrarAcessoDadosUseCase } from '@/application/lgpd/RegistrarAcessoDadosUseCase';
import { ConsultarTitularUseCase } from '@/application/lgpd/ConsultarTitularUseCase';
import { PrismaAcessoDadosRepository } from '@/infrastructure/database/PrismaAcessoDadosRepository';
import { PrismaTitularRepository } from '@/infrastructure/database/PrismaTitularRepository';

const acessoRepo = new PrismaAcessoDadosRepository();
const registrarAcesso = new RegistrarAcessoDadosUseCase(acessoRepo);
const consultarTitular = new ConsultarTitularUseCase(new PrismaTitularRepository());

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

  /**
   * `GET /lgpd/titular?cpf=` — reúne tudo que o sistema guarda de uma pessoa
   * (art. 18, I e II).
   *
   * A própria consulta é tratamento de dado pessoal, e das mais sensíveis:
   * cruza todos os cadastros de uma vez. Por isso ela mesma vai para a trilha,
   * com o CPF consultado, antes de responder.
   */
  async titular(req: Request, res: Response, next: NextFunction) {
    try {
      const relatorio = await consultarTitular.execute(String(req.query.cpf ?? ''));
      await acessoRepo.registrar({
        entidade: 'Titular',
        descricao: `Relatório do titular CPF ${relatorio.cpf} — ${relatorio.encontradoEm} ocorrência(s)`,
      });
      return res.json(relatorio);
    } catch (e) {
      return next(e);
    }
  }
}
