import type { Request, Response, NextFunction } from 'express';
import { AnexoUseCases } from '@/application/anexo/AnexoUseCases';
import { PrismaAnexoRepository } from '@/infrastructure/database/PrismaAnexoRepository';
import { DocumentoFiscalUseCases } from '@/application/documentoFiscal/DocumentoFiscalUseCases';
import { PagamentoUseCases } from '@/application/pagamento/PagamentoUseCases';
import { PrismaDocumentoFiscalRepository } from '@/infrastructure/database/PrismaDocumentoFiscalRepository';
import { PrismaPagamentoRepository } from '@/infrastructure/database/PrismaPagamentoRepository';
import { PrismaPrestacaoRepository } from '@/infrastructure/database/PrismaPrestacaoRepository';
import { BusinessError } from '@/shared/errors';
import type { DonoAnexo } from '@/core/anexo/Anexo';

const casos = new AnexoUseCases(new PrismaAnexoRepository());
const despesas = new DocumentoFiscalUseCases(
  new PrismaDocumentoFiscalRepository(),
  new PrismaPrestacaoRepository(),
);
const pagamentos = new PagamentoUseCases(new PrismaPagamentoRepository(), new PrismaPrestacaoRepository());

/**
 * O nome do arquivo como o usuário o vê — ver `AjusteController`.
 *
 * O multipart entrega o nome em latin1, então "Recibo nº 3 — março" chega
 * corrompido e é assim que fica gravado.
 */
const nomeOriginal = (nome: string) => Buffer.from(nome, 'latin1').toString('utf8');

/**
 * Anexos da despesa e do pagamento.
 *
 * **Toda rota confere o dono antes de tocar no anexo.** `Anexo` é filho, e o
 * recorte por órgão alcança só as raízes: sem passar pela nota (ou pelo
 * pagamento), que são recortadas, um id de anexo adivinhado atravessaria o
 * isolamento entre clientes. É o limite que o CLAUDE.md descreve, tratado no
 * lugar onde ele aparece.
 */
async function garantirDono(dono: DonoAnexo, donoId: string) {
  if (dono === 'DESPESA') await despesas.garantirDoOrgao(donoId);
  else await pagamentos.garantirDoOrgao(donoId);
}

export class AnexoController {
  async listar(dono: DonoAnexo, req: Request, res: Response, next: NextFunction) {
    try {
      await garantirDono(dono, req.params.id);
      return res.json(await casos.listar(dono, req.params.id));
    } catch (e) {
      return next(e);
    }
  }

  async enviar(dono: DonoAnexo, req: Request, res: Response, next: NextFunction) {
    try {
      await garantirDono(dono, req.params.id);
      const file = req.file;
      if (!file) throw new BusinessError('Selecione o arquivo.');
      const tipo = String(req.body?.tipo ?? '').trim();
      return res.status(201).json(
        await casos.salvar(dono, req.params.id, tipo, {
          nome: nomeOriginal(file.originalname),
          tamanho: file.size,
          conteudo: file.buffer,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  async baixar(dono: DonoAnexo, req: Request, res: Response, next: NextFunction) {
    try {
      await garantirDono(dono, req.params.id);
      const arquivo = await casos.baixar(dono, req.params.id, req.params.anexoId);
      // Sem Content-Type fixo: o anexo pode ser PDF ou imagem. O octet-stream
      // faz o navegador decidir pelo nome, e o `inline` mantém a prévia quando
      // ele sabe exibir.
      res.setHeader('Content-Length', arquivo.tamanho);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(arquivo.nome)}"`,
      );
      return res.end(arquivo.conteudo);
    } catch (e) {
      return next(e);
    }
  }

  async excluir(dono: DonoAnexo, req: Request, res: Response, next: NextFunction) {
    try {
      await garantirDono(dono, req.params.id);
      await casos.excluir(dono, req.params.id, req.params.anexoId);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
}
