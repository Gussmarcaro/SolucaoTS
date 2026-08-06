import type { Request, Response, NextFunction } from 'express';
import { CriarGrupoUseCase } from '@/application/grupo/CriarGrupoUseCase';
import { AtualizarGrupoUseCase } from '@/application/grupo/AtualizarGrupoUseCase';
import { ListarGruposUseCase } from '@/application/grupo/ListarGruposUseCase';
import { GerenciarGrupoUseCase } from '@/application/grupo/GerenciarGrupoUseCase';
import { PrismaGrupoRepository } from '@/infrastructure/database/PrismaGrupoRepository';
import { BusinessError } from '@/shared/errors';
import type { FiltrosGrupo } from '@/application/grupo/dtos';

const repo = new PrismaGrupoRepository();
const criar = new CriarGrupoUseCase(repo);
const atualizar = new AtualizarGrupoUseCase(repo);
const listar = new ListarGruposUseCase(repo);
const gerenciar = new GerenciarGrupoUseCase(repo);

function parseAtivo(v: unknown): boolean | undefined {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}

export class GrupoController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const filtros: FiltrosGrupo = { nome: q.nome as string | undefined, ativo: parseAtivo(q.ativo) };
      return res.json(
        await listar.execute({
          filtros,
          busca: q.busca as string | undefined,
          orderBy: q.orderBy as string | undefined,
          orderDir: q.orderDir as string | undefined,
          page: q.page ? Number(q.page) : undefined,
          pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  async listarAtivos(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await gerenciar.listarAtivos());
    } catch (e) {
      return next(e);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(await criar.execute(req.body));
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

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await atualizar.execute(req.params.id, req.body));
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

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await gerenciar.excluir(req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
