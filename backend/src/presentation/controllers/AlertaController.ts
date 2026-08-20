import type { Request, Response, NextFunction } from 'express';
import { ListarAlertasUseCase } from '@/application/alerta/ListarAlertasUseCase';
import { PrismaAlertaRepository } from '@/infrastructure/database/PrismaAlertaRepository';
import { PrismaCompromissoRepository } from '@/infrastructure/database/PrismaCompromissoRepository';

const listar = new ListarAlertasUseCase(new PrismaAlertaRepository());
const compromissos = new PrismaCompromissoRepository();

export class AlertaController {
  /** `GET /alertas` — prazos e pendências calculados na hora. */
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      // O sino passou a carregar lembretes da agenda, e agenda tem dono: sem o
      // espectador, o aviso de um compromisso particular apareceria para todos.
      const usuarioId = req.usuario?.id ?? "";
      const grupoId = usuarioId ? await compromissos.grupoDoUsuario(usuarioId) : null;
      return res.json(await listar.execute({ usuarioId, grupoId }));
    } catch (e) {
      return next(e);
    }
  }
}
