import { BusinessError } from '@/shared/errors';

/** Uma fala da conversa. O assistente é sem estado: o histórico vem do cliente. */
export interface MensagemAssistente {
  papel: 'usuario' | 'assistente';
  texto: string;
}

/** Porta do provedor de linguagem — o núcleo não conhece o SDK. */
export interface IAssistenteProvider {
  /** Emite a resposta em pedaços, para a tela mostrar enquanto é gerada. */
  responder(
    historico: MensagemAssistente[],
    aoReceber: (trecho: string) => void,
  ): Promise<void>;
}

const MAX_CARACTERES = 4000;
/** Últimas trocas mantidas. O corpus já é grande; histórico longo só encarece. */
const MAX_MENSAGENS = 20;

/**
 * Conversa com o assistente ancorado na documentação.
 *
 * Valida e recorta o histórico antes de repassar ao provedor. O recorte
 * preserva o fim da conversa, que é o contexto que importa para a próxima
 * resposta — cortar o começo perde menos que truncar a pergunta atual.
 */
export class ResponderAssistenteUseCase {
  constructor(private readonly provider: IAssistenteProvider) {}

  async execute(
    mensagens: MensagemAssistente[] | undefined,
    aoReceber: (trecho: string) => void,
  ): Promise<void> {
    const historico = (mensagens ?? [])
      .filter((m) => typeof m?.texto === 'string' && m.texto.trim())
      .map((m) => ({ papel: m.papel, texto: m.texto.trim().slice(0, MAX_CARACTERES) }))
      .slice(-MAX_MENSAGENS);

    if (!historico.length) throw new BusinessError('Envie uma pergunta.');
    if (historico[historico.length - 1].papel !== 'usuario')
      throw new BusinessError('A última mensagem precisa ser a pergunta do usuário.');

    await this.provider.responder(historico, aoReceber);
  }
}
