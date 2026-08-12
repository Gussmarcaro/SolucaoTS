import type { Request, Response, NextFunction } from 'express';
import { CriarAjusteUseCase } from '@/application/ajuste/CriarAjusteUseCase';
import { AtualizarAjusteUseCase } from '@/application/ajuste/AtualizarAjusteUseCase';
import { ListarAjustesUseCase } from '@/application/ajuste/ListarAjustesUseCase';
import { GerenciarAjusteUseCase } from '@/application/ajuste/GerenciarAjusteUseCase';
import { PrismaAjusteRepository } from '@/infrastructure/database/PrismaAjusteRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosAjuste } from '@/application/ajuste/dtos';

const repo = new PrismaAjusteRepository();
const criar = new CriarAjusteUseCase(repo);
const atualizar = new AtualizarAjusteUseCase(repo);
const listar = new ListarAjustesUseCase(repo);
const gerenciar = new GerenciarAjusteUseCase(repo);

export class AjusteController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await criar.execute(req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await atualizar.execute(req.params.id, req.body));
    } catch (e) {
      return next(e);
    }
  }

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await gerenciar.buscar(req.params.id));
    } catch (e) {
      return next(e);
    }
  }

  /** Anexa (ou substitui) o PDF do Termo de Ciência. Multipart, campo "arquivo". */
  async enviarTermoCiencia(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new BusinessError('Selecione o PDF do termo.');
      return res.json(
        await gerenciar.salvarTermoCiencia(req.params.id, {
          nome: file.originalname,
          tamanho: file.size,
          conteudo: file.buffer,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  async baixarTermoCiencia(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivo = await gerenciar.obterTermoCiencia(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', arquivo.tamanho);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
      return res.end(arquivo.conteudo);
    } catch (e) {
      return next(e);
    }
  }

  async removerTermoCiencia(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await gerenciar.removerTermoCiencia(req.params.id));
    } catch (e) {
      return next(e);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const filtros: FiltrosAjuste = {
        codigoAjuste: q.codigoAjuste as string | undefined,
        tipoAjuste: q.tipoAjuste as string | undefined,
        status: q.status as string | undefined,
        entidadeBeneficiariaId: q.entidadeBeneficiariaId as string | undefined,
      };
      const resultado = await listar.execute({
        filtros,
        busca: q.busca as string | undefined,
        orderBy: q.orderBy as string | undefined,
        orderDir: q.orderDir as string | undefined,
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      });
      return res.json(resultado);
    } catch (e) {
      return next(e);
    }
  }
}
