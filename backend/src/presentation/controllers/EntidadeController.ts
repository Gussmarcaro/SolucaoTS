import type { Request, Response, NextFunction } from 'express';
import { CriarEntidadeUseCase } from '@/application/entidade/CriarEntidadeUseCase';
import { AtualizarEntidadeUseCase } from '@/application/entidade/AtualizarEntidadeUseCase';
import { ListarEntidadesUseCase } from '@/application/entidade/ListarEntidadesUseCase';
import { GerenciarEntidadeUseCase } from '@/application/entidade/GerenciarEntidadeUseCase';
import { PrismaEntidadeRepository } from '@/infrastructure/database/PrismaEntidadeRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosEntidade } from '@/application/entidade/dtos';

const repo = new PrismaEntidadeRepository();
const criar = new CriarEntidadeUseCase(repo);
const atualizar = new AtualizarEntidadeUseCase(repo);
const listar = new ListarEntidadesUseCase(repo);
const gerenciar = new GerenciarEntidadeUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class EntidadeController {
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
      const filtros: FiltrosEntidade = {
        razaoSocial: q.razaoSocial as string | undefined,
        nomeFantasia: q.nomeFantasia as string | undefined,
        cnpj: q.cnpj as string | undefined,
        cidade: q.cidade as string | undefined,
        uf: q.uf as string | undefined,
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
