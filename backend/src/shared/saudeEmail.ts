import type { EstadoEmail } from '@/core/operacao/saudeOperacao';

/**
 * Memória do processo sobre o envio de e-mail: a primeira falha de uma
 * sequência, o último motivo e quantas foram. Um envio bem-sucedido zera.
 *
 * Em memória de propósito: o que interessa é "está falhando agora". Reiniciar
 * a API esquece, e a próxima falha volta a acender o aviso.
 */
let estado: EstadoEmail | null = null;

export function registrarFalhaEmail(motivo: string): void {
  estado = estado
    ? { ...estado, motivo, falhas: estado.falhas + 1 }
    : { falhandoDesde: new Date().toISOString(), motivo, falhas: 1 };
}

export function registrarEnvioEmail(): void {
  estado = null;
}

export function estadoEmail(): EstadoEmail | null {
  return estado;
}
