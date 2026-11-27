import type { Alerta } from '@/core/alerta/Alerta';
import { avaliarBackup, avaliarEmail, type EstadoEmail } from '@/core/operacao/saudeOperacao';

export interface IFonteOperacao {
  /** O log do backup, ou nulo quando o servidor não o informa (`BACKUP_LOG`). */
  logBackup(): Promise<string | null>;
  estadoEmail(): EstadoEmail | null;
}

/**
 * Alertas de operação — backup e e-mail. Só para a equipe do Suporte: o
 * órgão não tem o que fazer com eles, e quem conserta é quem cuida do servidor.
 */
export class AlertasOperacaoUseCase {
  constructor(private readonly fonte: IFonteOperacao) {}

  async execute(agora = new Date()): Promise<Alerta[]> {
    const log = await this.fonte.logBackup().catch(() => null);
    const problemas = [...(log === null ? [] : avaliarBackup(log, agora)), ...avaliarEmail(this.fonte.estadoEmail())];
    return problemas.map((p) => ({
      id: p.id,
      tipo: 'OPERACAO',
      urgencia: 'CRITICO',
      titulo: p.titulo,
      detalhe: p.detalhe,
      dias: null,
      referenciaId: null,
      tarefa: null,
    }));
  }
}
