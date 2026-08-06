import type { Request, Response, NextFunction } from 'express';
import { CriarBemCedidoUseCase } from '@/application/bemCedido/CriarBemCedidoUseCase';
import { AtualizarBemCedidoUseCase } from '@/application/bemCedido/AtualizarBemCedidoUseCase';
import { ListarBensCedidosUseCase } from '@/application/bemCedido/ListarBensCedidosUseCase';
import { GerenciarBemCedidoUseCase } from '@/application/bemCedido/GerenciarBemCedidoUseCase';
import { PrismaBemCedidoRepository } from '@/infrastructure/database/PrismaBemCedidoRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosBemCedido } from '@/application/bemCedido/dtos';

const repo = new PrismaBemCedidoRepository();
const criar = new CriarBemCedidoUseCase(repo);
const atualizar = new AtualizarBemCedidoUseCase(repo);
const listar = new ListarBensCedidosUseCase(repo);
const gerenciar = new GerenciarBemCedidoUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class BemCedidoController {
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

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const filtros: FiltrosBemCedido = {
        descricao: q.descricao as string | undefined,
        tipo: q.tipo as string | undefined,
        identificador: q.identificador as string | undefined,
        ativo: parseAtivo(q.ativo),
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

  async definirAtivo(req: Request, res: Response, next: NextFunction) {
    try {
      const ativo = parseAtivo(req.body?.ativo);
      if (ativo === undefined) throw new BusinessError('Informe o campo "ativo" (true/false).');
      return res.json(await gerenciar.definirAtivo(req.params.id, ativo));
    } catch (e) {
      return next(e);
    }
  }
}
