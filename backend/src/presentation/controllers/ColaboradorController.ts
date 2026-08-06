import type { Request, Response, NextFunction } from 'express';
import { CriarColaboradorUseCase } from '@/application/colaborador/CriarColaboradorUseCase';
import { AtualizarColaboradorUseCase } from '@/application/colaborador/AtualizarColaboradorUseCase';
import { ListarColaboradoresUseCase } from '@/application/colaborador/ListarColaboradoresUseCase';
import { GerenciarColaboradorUseCase } from '@/application/colaborador/GerenciarColaboradorUseCase';
import { PrismaColaboradorRepository } from '@/infrastructure/database/PrismaColaboradorRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosColaborador } from '@/application/colaborador/dtos';

const repo = new PrismaColaboradorRepository();
const criar = new CriarColaboradorUseCase(repo);
const atualizar = new AtualizarColaboradorUseCase(repo);
const listar = new ListarColaboradoresUseCase(repo);
const gerenciar = new GerenciarColaboradorUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class ColaboradorController {
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
      const filtros: FiltrosColaborador = {
        nome: q.nome as string | undefined,
        cpf: q.cpf as string | undefined,
        cargo: q.cargo as string | undefined,
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
