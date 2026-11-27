import type { Request, Response, NextFunction } from 'express';
import { ListarAlertasUseCase } from '@/application/alerta/ListarAlertasUseCase';
import { PrismaAlertaRepository } from '@/infrastructure/database/PrismaAlertaRepository';
import { PrismaCompromissoRepository } from '@/infrastructure/database/PrismaCompromissoRepository';
import { AlertasOperacaoUseCase } from '@/application/operacao/AlertasOperacaoUseCase';
import { FonteOperacao } from '@/infrastructure/operacao/FonteOperacao';

const listar = new ListarAlertasUseCase(new PrismaAlertaRepository());
const compromissos = new PrismaCompromissoRepository();
const operacao = new AlertasOperacaoUseCase(new FonteOperacao());

export class AlertaController {
  /** `GET /alertas` — prazos e pendências calculados na hora. */
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      // O sino passou a carregar lembretes da agenda, e agenda tem dono: sem o
      // espectador, o aviso de um compromisso particular apareceria para todos.
      const usuarioId = req.usuario?.id ?? "";
      const grupoId = usuarioId ? await compromissos.grupoDoUsuario(usuarioId) : null;
      const alertas = await listar.execute({ usuarioId, grupoId });
      // Backup e e-mail vêm primeiro, e só para o Suporte: é quem conserta.
      return res.json(req.usuario?.suporte ? [...(await operacao.execute()), ...alertas] : alertas);
    } catch (e) {
      return next(e);
    }
  }
}
