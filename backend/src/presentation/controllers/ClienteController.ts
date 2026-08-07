import type { Request, Response, NextFunction } from 'express';
import { CriarClienteUseCase } from '@/application/cliente/CriarClienteUseCase';
import { AtualizarClienteUseCase } from '@/application/cliente/AtualizarClienteUseCase';
import { ListarClientesUseCase } from '@/application/cliente/ListarClientesUseCase';
import { GerenciarClienteUseCase } from '@/application/cliente/GerenciarClienteUseCase';
import { PrismaClienteRepository } from '@/infrastructure/database/PrismaClienteRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosCliente } from '@/application/cliente/dtos';

const repo = new PrismaClienteRepository();
const criar = new CriarClienteUseCase(repo);
const atualizar = new AtualizarClienteUseCase(repo);
const listar = new ListarClientesUseCase(repo);
const gerenciar = new GerenciarClienteUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class ClienteController {
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
      const filtros: FiltrosCliente = {
        nome: q.nome as string | undefined,
        cnpj: q.cnpj as string | undefined,
        tipoOrgao: q.tipoOrgao as string | undefined,
        periodicidade: q.periodicidade as string | undefined,
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
