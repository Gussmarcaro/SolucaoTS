import type { IMontadorRepository } from './IMontadorRepository';
import type { IValidadorSchema } from './IValidadorSchema';
import type { ResultadoConferencia } from './tipos';
import { NotFoundError } from '@/shared/errors';
import { montarPrestacao } from './montarPrestacao';
import { conferirPrestacao } from './conferirPrestacao';
import { codigosUsados } from './MontarPrestacaoUseCase';

/**
 * "Esta prestação está pronta?"
 *
 * Responde a pergunta na própria prestação, em vez de só no Espelho — que é
 * uma tela que se abre de propósito, quando já se decidiu transmitir. O erro
 * caro não é o de quem confere; é o de quem não sabia que havia o que conferir.
 *
 * Reúne duas coisas de naturezas diferentes, e é importante que continuem
 * distintas na resposta:
 *
 * - **erros/avisos** vêm do montador — regras do manual e o JSON Schema oficial.
 *   São o que o TCESP recusa.
 * - **pendências** vêm de `conferirPrestacao` — o que passa na validação e
 *   ainda assim está errado (a prestação vazia é o caso clássico).
 *
 * Monta o documento e o descarta: o custo é o mesmo da prévia do JSON, e é o
 * preço de a conferência enxergar exatamente o que seria transmitido, em vez
 * de uma segunda opinião que pode divergir.
 */
export class ConferirPrestacaoUseCase {
  constructor(
    private readonly repo: IMontadorRepository,
    private readonly validadorSchema?: IValidadorSchema,
  ) {}

  async execute(prestacaoId: string): Promise<ResultadoConferencia> {
    const dados = await this.repo.carregar(prestacaoId);
    if (!dados) throw new NotFoundError('Prestação não encontrada.');
    const contexto = await this.repo.contextoConferencia(prestacaoId);
    if (!contexto) throw new NotFoundError('Prestação não encontrada.');

    const inexistentes = await this.repo.codigosInexistentes(codigosUsados(dados));
    const montagem = montarPrestacao(dados, inexistentes);

    const schema = this.validadorSchema?.validar(dados.tipoAjuste, montagem.documento);
    const erros = [...montagem.erros, ...(schema?.erros ?? [])];
    const avisos =
      schema && !schema.validado
        ? [
            ...montagem.avisos,
            `A validação contra o JSON Schema do TCESP não pôde ser executada (${schema.motivo ?? 'motivo desconhecido'}). O documento pode ser rejeitado no envio por problema estrutural.`,
          ]
        : montagem.avisos;

    const pendencias = conferirPrestacao(dados, contexto);

    return {
      // "Pronta" é afirmação forte, então exige as duas coisas: nada que o
      // Tribunal recuse, e nada que a conferência considere impeditivo.
      // Aviso e atenção não impedem — são para ler, não para travar.
      pronta: erros.length === 0 && !pendencias.some((p) => p.severidade === 'IMPEDE'),
      erros,
      avisos,
      pendencias,
    };
  }
}
