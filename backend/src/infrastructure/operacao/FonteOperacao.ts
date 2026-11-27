import { open } from 'node:fs/promises';
import type { IFonteOperacao } from '@/application/operacao/AlertasOperacaoUseCase';
import { estadoEmail } from '@/shared/saudeEmail';

/** Só o fim do log interessa; o arquivo cresce para sempre. */
const BYTES_DO_FIM = 16_384;

/**
 * `BACKUP_LOG` aponta para o log do `backup-banco.sh` no servidor
 * (`/home/solucao/backups/backup.log`). Sem a variável — desenvolvimento, CI —
 * o aviso de backup simplesmente não existe.
 */
export class FonteOperacao implements IFonteOperacao {
  async logBackup(): Promise<string | null> {
    const caminho = process.env.BACKUP_LOG?.trim();
    if (!caminho) return null;
    const arq = await open(caminho, 'r');
    try {
      const { size } = await arq.stat();
      const inicio = Math.max(0, size - BYTES_DO_FIM);
      const buf = Buffer.alloc(size - inicio);
      await arq.read(buf, 0, buf.length, inicio);
      return buf.toString('utf8');
    } finally {
      await arq.close();
    }
  }

  estadoEmail() {
    return estadoEmail();
  }
}
