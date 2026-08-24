import type { Request, Response, NextFunction } from 'express';
import { BusinessError } from '@/shared/errors';
import type { ArquivoPdf } from '@/core/entidade/complementos';
import { DocumentoFiscalUseCases } from '@/application/documentoFiscal/DocumentoFiscalUseCases';
import { PrismaDocumentoFiscalRepository } from '@/infrastructure/database/PrismaDocumentoFiscalRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';

const casos = new DocumentoFiscalUseCases(
  new PrismaDocumentoFiscalRepository(),
  new PrismaPrestacaoRepository(),
);

function arquivoDaRequisicao(req: Request): ArquivoPdf {
  const file = req.file;
  if (!file) throw new BusinessError('Selecione o arquivo PDF do documento fiscal.');
  return { nome: file.originalname, tamanho: file.size, conteudo: file.buffer };
}

export class DocumentoFiscalController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listar(req.params.prestacaoId));
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criar(req.params.prestacaoId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.atualizar(req.params.prestacaoId, req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluir(req.params.prestacaoId, req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }

  /** Anexa a digitalização da nota. Reenviar substitui a anterior. */
  async enviarArquivo(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.anexarArquivo(req.params.prestacaoId, req.params.id, arquivoDaRequisicao(req)),
      );
    } catch (e) {
      return next(e);
    }
  }

  /**
   * Download da nota — é este o acesso da Comissão de Fiscalização.
   *
   * `inline` para o navegador abrir na aba: conferir uma nota é olhar, não
   * colecionar arquivo na pasta de downloads.
   */
  async baixarArquivo(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivo = await casos.obterArquivo(req.params.prestacaoId, req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', arquivo.tamanho);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
      return res.end(arquivo.conteudo);
    } catch (e) {
      return next(e);
    }
  }

  async removerArquivo(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.removerArquivo(req.params.prestacaoId, req.params.id));
    } catch (e) {
      return next(e);
    }
  }
}
