import type { Request, Response, NextFunction } from 'express';
import { DocumentoFiscalUseCases } from '@/application/documentoFiscal/DocumentoFiscalUseCases';
import { PrismaDocumentoFiscalRepository } from '@/infrastructure/database/PrismaDocumentoFiscalRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { PrismaRateioRepository } from '@/infrastructure/database/PrismaRateioRepository';

/**
 * Despesas — os documentos fiscais do **órgão**, em Execução → Financeiro.
 *
 * Os mesmos casos de uso da aba da prestação, no escopo de cima: aqui a nota é
 * lançada quando a despesa acontece; a prestação depois se apropria dela. Não
 * há `prestacaoId` em nenhuma rota, e é essa ausência que define a tela.
 *
 * O órgão nunca vem da requisição — sai do token, pela extension de tenant.
 * Aceitá-lo do cliente transformaria esta família de rotas na despesa de
 * qualquer órgão.
 */
const casos = new DocumentoFiscalUseCases(
  new PrismaDocumentoFiscalRepository(),
  new PrismaPrestacaoRepository(),
  new PrismaRateioRepository(),
);

export class DespesaController {
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
