import type { Request, Response, NextFunction } from 'express';
import { PagamentoUseCases } from '@/application/pagamento/PagamentoUseCases';
import { PrismaPagamentoRepository } from '@/infrastructure/database/PrismaPagamentoRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { DocumentoFiscalUseCases } from '@/application/documentoFiscal/DocumentoFiscalUseCases';
import { PrismaDocumentoFiscalRepository } from '@/infrastructure/database/PrismaDocumentoFiscalRepository';
import { PrismaRateioRepository } from '@/infrastructure/database/PrismaRateioRepository';

/**
 * Pagamentos — no escopo do **órgão**, em Execução → Financeiro.
 *
 * Os mesmos casos de uso da aba da prestação, um nível acima: o lançamento
 * acontece quando o dinheiro entra ou sai; a prestação depois escolhe quais
 * lançamentos do período entram nela.
 *
 * Nenhuma rota recebe `prestacaoId`, e é essa ausência que define a tela. O
 * órgão nunca vem da requisição — sai do token, pela extension de tenant.
 */
const casos = new PagamentoUseCases(
  new PrismaPagamentoRepository(),
  new PrismaPrestacaoRepository(),
  new DocumentoFiscalUseCases(new PrismaDocumentoFiscalRepository(), new PrismaPrestacaoRepository()),
  new PrismaRateioRepository(),
);

export class PagamentoOrgaoController {
  /** Lanca o pagamento de uma nota rateada: um por ajuste, de uma vez. */
  async ratear(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.ratearNoOrgao(req.body));
    } catch (e) {
      return next(e);
    }
  }

  async listar(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarDoOrgao());
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criarNoOrgao(req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizarNoOrgao(req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluirDoOrgao(req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
