import type { Request, Response, NextFunction } from 'express';
import { CompromissoUseCases } from '@/application/compromisso/CompromissoUseCases';
import { PrismaCompromissoRepository } from '@/infrastructure/database/PrismaCompromissoRepository';
import { permissoesDoGrupo } from '@/infrastructure/database/permissoesCache';
import { AppError, BusinessError } from '@/shared/errors';

const casos = new CompromissoUseCases(new PrismaCompromissoRepository());

const flag = (v: unknown) => v === 'true' || v === true;

/** Usuário autenticado, ou 401 — nenhuma rota da agenda é anônima. */
function exigirUsuario(req: Request): string {
  const id = req.usuario?.id;
  if (!id) throw new AppError('Autenticação necessária.', 401, 'NAO_AUTENTICADO');
  return id;
}

/**
 * "Administra a agenda" é a faixa **Total** do recurso `AGENDA`.
 *
 * Reusa o RBAC que já existe em vez de criar uma escala paralela de ações
 * ("editar compartilhado", "administrar agenda"…): o administrador configura
 * um lugar só, e a regra fina de propriedade — quem criou, quem é responsável —
 * fica no caso de uso, onde ela pode olhar o registro concreto.
 */
async function administraAgenda(req: Request): Promise<boolean> {
  const grupo = req.usuario?.grupo;
  if (!grupo) return false;
  const concessoes = await permissoesDoGrupo(grupo);
  // Grupo nunca configurado (sem concessão nenhuma) acessa tudo — é a regra da
  // casa, e mantê-la aqui evita que a agenda se comporte diferente do resto.
  if (concessoes.size === 0) return true;
  return concessoes.get('AGENDA')?.has('DELETE') === true;
}

export class CompromissoController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      exigirUsuario(req);
      return res.status(201).json(await casos.criar(req.body));
    } catch (e) {
      return next(e);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const quem = await casos.espectador(exigirUsuario(req));
      return res.json(
        await casos.atualizar(req.params.id, req.body, quem, await administraAgenda(req)),
      );
    } catch (e) {
      return next(e);
    }
  }

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      const quem = await casos.espectador(exigirUsuario(req));
      return res.json(await casos.buscar(req.params.id, quem));
    } catch (e) {
      return next(e);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = exigirUsuario(req);
      const quem = await casos.espectador(usuarioId);
      const q = req.query;
      return res.json(
        await casos.listar({
          quem,
          filtros: {
            de: q.de,
            ate: q.ate,
            tipo: q.tipo,
            status: q.status,
            ajusteId: q.ajusteId,
            responsavelId: q.responsavelId === 'eu' ? usuarioId : q.responsavelId,
            participanteId: q.participanteId === 'eu' ? usuarioId : q.participanteId,
            grupoId: q.grupoId,
            busca: q.busca,
            pendentesDeRegistro: flag(q.pendentesDeRegistro),
          },
        }),
      );
    } catch (e) {
      return next(e);
    }
  }

  async resumo(req: Request, res: Response, next: NextFunction) {
    try {
      const quem = await casos.espectador(exigirUsuario(req));
      return res.json(await casos.resumo(quem));
    } catch (e) {
      return next(e);
    }
  }

  async definirStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const quem = await casos.espectador(exigirUsuario(req));
      const status = req.body?.status;
      if (typeof status !== 'string') throw new BusinessError('Informe o campo "status".');
      return res.json(
        await casos.definirStatus(req.params.id, status, quem, await administraAgenda(req)),
      );
    } catch (e) {
      return next(e);
    }
  }

  /** Remarcar arrastando na grade — muda só o horário. */
  async mover(req: Request, res: Response, next: NextFunction) {
    try {
      const quem = await casos.espectador(exigirUsuario(req));
      return res.json(
        await casos.mover(req.params.id, req.body ?? {}, quem, await administraAgenda(req)),
      );
    } catch (e) {
      return next(e);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      const quem = await casos.espectador(exigirUsuario(req));
      await casos.excluir(req.params.id, quem, await administraAgenda(req));
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  }
}
