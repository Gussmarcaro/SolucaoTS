import type { Request, Response, NextFunction } from 'express';
import { ExecucaoTecnicaUseCases } from '@/application/execucaoTecnica/ExecucaoTecnicaUseCases';
import { RelatorioAtividadeUseCases } from '@/application/relatorioAtividade/RelatorioAtividadeUseCases';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { PrismaProgramaRepository } from '@/infrastructure/database/PrismaProgramaRepository';
import { PrismaRelatorioAtividadeRepository } from '@/infrastructure/database/PrismaRelatorioAtividadeRepository';

const afericoes = new PrismaRelatorioAtividadeRepository();
const prestacoes = new PrismaPrestacaoRepository();

const casos = new ExecucaoTecnicaUseCases(
  new PrismaAjusteRepository(),
  prestacoes,
  new PrismaProgramaRepository(),
  afericoes,
  // A escrita é delegada ao caso de uso do bloco, para a validação ser uma só.
  new RelatorioAtividadeUseCases(afericoes, prestacoes),
);

/**
 * Execução Técnica: o realizado das metas, lançado ao longo do ano.
 *
 * O ajuste e o exercício vêm da query (ou do corpo, na gravação) porque a tela
 * vive dentro do portão da Execução, que já escolheu a parceria.
 */
export class ExecucaoTecnicaController {
  async painel(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.painel(String(req.query.ajusteId ?? ''), req.query.exercicio));
    } catch (e) {
      return next(e);
    }
  }

  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const { ajusteId, exercicio, ...afericao } = req.body ?? {};
      return res.json(await casos.registrar(String(ajusteId ?? ''), exercicio, afericao));
    } catch (e) {
      return next(e);
    }
  }

  async remover(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.remover(String(req.query.ajusteId ?? ''), req.query.exercicio, req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
