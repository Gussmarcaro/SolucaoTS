import Anthropic from '@anthropic-ai/sdk';
import { AppError } from '@/shared/errors';
import { INSTRUCOES } from '@/application/assistente/instrucoes';
import type {
  IAssistenteProvider,
  MensagemAssistente,
} from '@/application/assistente/ResponderAssistenteUseCase';
import { corpus } from './baseConhecimento';

const MODELO = 'claude-opus-5';

/** Teto por resposta. Alto o bastante para um passo a passo longo do manual. */
const MAX_TOKENS = 4096;

/**
 * Provedor do assistente sobre a API da Anthropic.
 *
 * Duas decisões moldam o custo e a qualidade aqui:
 *
 * **Contexto inteiro, sem busca por trechos.** Os ~250 KB da documentação vão
 * no prompt a cada pergunta, em vez de recuperar os pedaços "mais parecidos"
 * com a pergunta. Busca por similaridade erra justamente onde a Fase V dói: a
 * regra que responde a pergunta costuma estar numa tabela ou numa nota de
 * rodapé que não repete as palavras de quem pergunta, e o que o modelo não
 * recebe ele não pode citar — só supor. Com o manual inteiro à vista, "não
 * encontrei na documentação" passa a significar de fato que não está lá.
 *
 * **Cache do prompt.** O corpus é idêntico em toda pergunta, então entra como
 * bloco de sistema com `cache_control`: a partir da segunda pergunta ele é
 * cobrado a um décimo do preço. O TTL de 1 hora cobre o intervalo entre
 * perguntas de uma mesma sessão de trabalho. Isto só funciona porque nada
 * volátil (data, nome do usuário, id da requisição) entra antes do corpus —
 * qualquer byte diferente no início invalidaria o cache inteiro.
 */
export class ClaudeAssistente implements IAssistenteProvider {
  private cliente: Anthropic | null = null;

  /** `true` quando há credencial configurada; a rota devolve 503 sem ela. */
  get disponivel(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private obterCliente(): Anthropic {
    if (!this.disponivel)
      throw new AppError(
        'O assistente não está configurado neste ambiente (falta ANTHROPIC_API_KEY).',
        503,
        'ASSISTENTE_INDISPONIVEL',
      );
    if (!this.cliente) this.cliente = new Anthropic();
    return this.cliente;
  }

  async responder(
    historico: MensagemAssistente[],
    aoReceber: (trecho: string) => void,
  ): Promise<void> {
    const stream = this.obterCliente().messages.stream({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      // `low` é deliberado: a tarefa é localizar e reproduzir o que o manual
      // diz, não raciocinar longamente. Esforço alto aqui gasta tokens e
      // atrasa a primeira palavra sem melhorar a fidelidade à fonte.
      output_config: { effort: 'low' },
      system: [
        // Ordem: primeiro o corpus (estável, cacheado), depois as instruções.
        { type: 'text', text: corpus(), cache_control: { type: 'ephemeral', ttl: '1h' } },
        { type: 'text', text: INSTRUCOES },
      ],
      messages: historico.map((m) => ({
        role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
        content: m.texto,
      })),
    });

    stream.on('text', aoReceber);

    const resposta = await stream.finalMessage();

    // Uma recusa vem como HTTP 200 com `content` vazio — quem lê `content[0]`
    // sem checar recebe um silêncio inexplicável no lugar de uma mensagem.
    if (resposta.stop_reason === 'refusal')
      throw new AppError(
        'Não consigo responder a essa mensagem. Reformule a pergunta em torno do sistema ou da Fase V.',
        422,
        'ASSISTENTE_RECUSOU',
      );
  }
}
