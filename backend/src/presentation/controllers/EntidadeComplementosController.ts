import type { Request, Response, NextFunction } from 'express';
import { EntidadeComplementosUseCases } from '@/application/entidadeComplementos/EntidadeComplementosUseCases';
import { PrismaEntidadeComplementosRepository } from '@/infrastructure/database/PrismaEntidadeComplementosRepository';
import { BusinessError } from '@/shared/errors';
import type { ArquivoPdf } from '@/core/entidade/complementos';

const casos = new EntidadeComplementosUseCases(new PrismaEntidadeComplementosRepository());

/** Extrai o PDF do multipart, recusando requisição sem arquivo. */
function arquivoDaRequisicao(req: Request): ArquivoPdf {
  const file = req.file;
  if (!file) throw new BusinessError('Selecione o arquivo PDF.');
  return { nome: file.originalname, tamanho: file.size, conteudo: file.buffer };
}

/** Envia o PDF para o navegador abrir na aba. */
function responderPdf(res: Response, arquivo: ArquivoPdf) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', arquivo.tamanho);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
  return res.end(arquivo.conteudo);
}

export class EntidadeComplementosController {
  // ---- Diretoria ----

  async listarDiretoria(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarDiretoria(req.params.entidadeId));
    } catch (e) {
      return next(e);
    }
  }

  async criarDiretoria(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criarMembroDiretoria(req.params.entidadeId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizarDiretoria(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.atualizarMembroDiretoria(req.params.entidadeId, req.params.id, req.body),
      );
    } catch (e) {
      return next(e);
    }
  }

  async excluirDiretoria(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluirMembroDiretoria(req.params.entidadeId, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  // ---- Atas de eleição da diretoria ----

  async listarAtas(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarAtasDiretoria(req.params.entidadeId));
    } catch (e) {
      return next(e);
    }
  }

  async enviarAta(req: Request, res: Response, next: NextFunction) {
    try {
      const ata = await casos.anexarAtaDiretoria(req.params.entidadeId, arquivoDaRequisicao(req));
      return res.status(201).json(ata);
    } catch (e) {
      return next(e);
    }
  }

  async baixarAta(req: Request, res: Response, next: NextFunction) {
    try {
      return responderPdf(
        res,
        await casos.obterAtaDiretoria(req.params.entidadeId, req.params.id),
      );
    } catch (e) {
      return next(e);
    }
  }

  async excluirAta(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluirAtaDiretoria(req.params.entidadeId, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  // ---- Conselhos ----

  async listarConselhos(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarConselhos(req.params.entidadeId));
    } catch (e) {
      return next(e);
    }
  }

  async criarConselho(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criarMembroConselho(req.params.entidadeId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizarConselho(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.atualizarMembroConselho(req.params.entidadeId, req.params.id, req.body),
      );
    } catch (e) {
      return next(e);
    }
  }

  async excluirConselho(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluirMembroConselho(req.params.entidadeId, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  async enviarAtaConselho(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.salvarAtaConselho(
          req.params.entidadeId,
          req.params.id,
          arquivoDaRequisicao(req),
        ),
      );
    } catch (e) {
      return next(e);
    }
  }

  async baixarAtaConselho(req: Request, res: Response, next: NextFunction) {
    try {
      return responderPdf(res, await casos.obterAtaConselho(req.params.entidadeId, req.params.id));
    } catch (e) {
      return next(e);
    }
  }

  async removerAtaConselho(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.removerAtaConselho(req.params.entidadeId, req.params.id));
    } catch (e) {
      return next(e);
    }
  }

  // ---- Regularidade fiscal / cadastral ----

  async listarDocumentos(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.listarDocumentos(req.params.entidadeId));
    } catch (e) {
      return next(e);
    }
  }

  async criarDocumento(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await casos.criarDocumento(req.params.entidadeId, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizarDocumento(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.atualizarDocumento(req.params.entidadeId, req.params.id, req.body),
      );
    } catch (e) {
      return next(e);
    }
  }

  async excluirDocumento(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.excluirDocumento(req.params.entidadeId, req.params.id);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  async enviarArquivoDocumento(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(
        await casos.salvarArquivoDocumento(
          req.params.entidadeId,
          req.params.id,
          arquivoDaRequisicao(req),
        ),
      );
    } catch (e) {
      return next(e);
    }
  }

  async baixarArquivoDocumento(req: Request, res: Response, next: NextFunction) {
    try {
      return responderPdf(
        res,
        await casos.obterArquivoDocumento(req.params.entidadeId, req.params.id),
      );
    } catch (e) {
      return next(e);
    }
  }

  async removerArquivoDocumento(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.removerArquivoDocumento(req.params.entidadeId, req.params.id));
    } catch (e) {
      return next(e);
    }
  }
}
