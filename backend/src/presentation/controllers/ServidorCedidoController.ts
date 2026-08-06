import type { Request, Response, NextFunction } from 'express';
import { CriarServidorCedidoUseCase } from '@/application/servidorCedido/CriarServidorCedidoUseCase';
import { AtualizarServidorCedidoUseCase } from '@/application/servidorCedido/AtualizarServidorCedidoUseCase';
import { ListarServidoresCedidosUseCase } from '@/application/servidorCedido/ListarServidoresCedidosUseCase';
import { GerenciarServidorCedidoUseCase } from '@/application/servidorCedido/GerenciarServidorCedidoUseCase';
import { PrismaServidorCedidoRepository } from '@/infrastructure/database/PrismaServidorCedidoRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosServidorCedido } from '@/application/servidorCedido/dtos';

const repo = new PrismaServidorCedidoRepository();
const criar = new CriarServidorCedidoUseCase(repo);
const atualizar = new AtualizarServidorCedidoUseCase(repo);
const listar = new ListarServidoresCedidosUseCase(repo);
const gerenciar = new GerenciarServidorCedidoUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class ServidorCedidoController {
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
      const filtros: FiltrosServidorCedido = {
        nome: q.nome as string | undefined,
        cpf: q.cpf as string | undefined,
        cargoPublico: q.cargoPublico as string | undefined,
        onusPagamento: q.onusPagamento as string | undefined,
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
