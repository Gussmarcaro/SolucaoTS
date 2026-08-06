import type { Request, Response, NextFunction } from 'express';
import { CriarContratoUseCase } from '@/application/contrato/CriarContratoUseCase';
import { AtualizarContratoUseCase } from '@/application/contrato/AtualizarContratoUseCase';
import { ListarContratosUseCase } from '@/application/contrato/ListarContratosUseCase';
import { GerenciarContratoUseCase } from '@/application/contrato/GerenciarContratoUseCase';
import { PrismaContratoRepository } from '@/infrastructure/database/PrismaContratoRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosContrato } from '@/application/contrato/dtos';

const repo = new PrismaContratoRepository();
const criar = new CriarContratoUseCase(repo);
const atualizar = new AtualizarContratoUseCase(repo);
const listar = new ListarContratosUseCase(repo);
const gerenciar = new GerenciarContratoUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class ContratoController {
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
      const filtros: FiltrosContrato = {
        numero: q.numero as string | undefined,
        credorNome: q.credorNome as string | undefined,
        credorDocumento: q.credorDocumento as string | undefined,
        naturezaContratacao: q.naturezaContratacao as string | undefined,
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
