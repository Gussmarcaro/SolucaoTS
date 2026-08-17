import type { Request, Response, NextFunction } from 'express';
import { CriarTarefaUseCase } from '@/application/tarefa/CriarTarefaUseCase';
import { AtualizarTarefaUseCase } from '@/application/tarefa/AtualizarTarefaUseCase';
import { ListarTarefasUseCase } from '@/application/tarefa/ListarTarefasUseCase';
import { GerenciarTarefaUseCase } from '@/application/tarefa/GerenciarTarefaUseCase';
import { PrismaTarefaRepository } from '@/infrastructure/database/PrismaTarefaRepository';
import { BusinessError } from '@/shared/errors';

const repo = new PrismaTarefaRepository();
const criar = new CriarTarefaUseCase(repo);
const atualizar = new AtualizarTarefaUseCase(repo);
const listar = new ListarTarefasUseCase(repo);
const gerenciar = new GerenciarTarefaUseCase(repo);

const flag = (v: unknown) => v === 'true' || v === true;

export class TarefaController {
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
      return res.json(
        await listar.execute({
          filtros: {
            status: q.status,
            prioridade: q.prioridade,
            ajusteId: q.ajusteId,
            responsavelId: q.responsavelId === 'eu' ? req.usuario?.id : q.responsavelId,
            abertas: flag(q.abertas),
            atrasadas: flag(q.atrasadas),
          },
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

  async resumo(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await listar.resumo());
    } catch (e) {
      return next(e);
    }
  }

  async definirStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.body?.status;
      if (typeof status !== 'string') throw new BusinessError('Informe o campo "status".');
      return res.json(await gerenciar.definirStatus(req.params.id, status));
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
