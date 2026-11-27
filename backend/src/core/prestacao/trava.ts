/**
 * Quando a prestação deixa de poder ser editada, e como se reabre.
 *
 * **Por que travar.** Depois de transmitida à **produção**, a prestação é o que
 * o TCESP recebeu. Se os blocos continuassem editáveis, a tela passaria a
 * mostrar uma coisa e o Tribunal guardaria outra — e ninguém saberia qual era
 * a versão enviada. Por isso cada envio guarda o JSON exato
 * (`PrestacaoEnvio`), e a edição fica travada enquanto o envio vale.
 *
 * **O piloto não trava.** É ambiente de teste: enviar lá, corrigir e reenviar
 * é o uso normal.
 *
 * **Rejeitada destrava.** O Tribunal recusou; é preciso corrigir e reenviar.
 *
 * **Como se reabre uma armazenada: retificação** (manual v1.19, §2.7). A
 * retificação é a prestação completa de novo, com `retificacao: true`, e
 * substitui a anterior. Retificar um exercício faz o TCESP **excluir** as
 * prestações armazenadas dos exercícios **posteriores** do mesmo ajuste, que
 * terão de ser reenviadas — o sistema avisa antes.
 */

export type StatusPrestacao = 'EM_ELABORACAO' | 'ENVIADO' | 'ARMAZENADO' | 'REJEITADO' | 'SUBSTITUIDO' | 'EXCLUIDO';

export interface EstadoTrava {
  status: StatusPrestacao | string;
  /** Já houve envio aceito (com protocolo) à produção. */
  enviadaProducao: boolean;
}

export function estaTravada(e: EstadoTrava): boolean {
  return e.enviadaProducao && (e.status === 'ENVIADO' || e.status === 'ARMAZENADO');
}

export const MOTIVO_TRAVA =
  'A prestação foi transmitida ao TCESP (produção) e está travada para edição. Para alterar, inicie uma retificação.';

/** O que impede transmitir de novo à produção. Nulo quando pode. */
export function bloqueioDeEnvio(e: EstadoTrava, ambiente: 'PILOTO' | 'PRODUCAO'): string | null {
  if (ambiente !== 'PRODUCAO' || !e.enviadaProducao) return null;
  if (e.status === 'ARMAZENADO')
    return 'Esta prestação já está armazenada no TCESP. Para enviar outra versão, use "Iniciar retificação".';
  if (e.status === 'ENVIADO')
    return 'Esta prestação já foi enviada e aguarda o processamento do TCESP. Consulte o status antes de enviar de novo.';
  return null;
}

/** Retificação só existe para o que o Tribunal armazenou. */
export function podeRetificar(e: EstadoTrava): string | null {
  if (!e.enviadaProducao || e.status !== 'ARMAZENADO')
    return 'Só uma prestação armazenada no TCESP (produção) pode ser retificada.';
  return null;
}
