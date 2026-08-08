import type { IMontadorRepository } from './IMontadorRepository';
import type { IValidadorSchema } from './IValidadorSchema';
import type { DadosMontagem, ResultadoMontagem } from './tipos';
import { NotFoundError } from '@/shared/errors';
import { montarPrestacao } from './montarPrestacao';

export class MontarPrestacaoUseCase {
  constructor(
    private readonly repo: IMontadorRepository,
    private readonly validadorSchema?: IValidadorSchema,
  ) {}

  async execute(prestacaoId: string): Promise<ResultadoMontagem> {
    const dados = await this.repo.carregar(prestacaoId);
    if (!dados) throw new NotFoundError('Prestação não encontrada.');
    const inexistentes = await this.repo.codigosInexistentes(codigosUsados(dados));
    const resultado = montarPrestacao(dados, inexistentes);

    // Validação estrutural: o TCESP rejeita no envio o documento que não
    // casar com o schema, antes de qualquer regra de negócio.
    if (!this.validadorSchema) return resultado;

    const schema = this.validadorSchema.validar(dados.tipoAjuste, resultado.documento);
    return {
      ...resultado,
      erros: [...resultado.erros, ...schema.erros],
      // Sem a checagem estrutural o documento pode passar aqui e ser rejeitado
      // no envio — o usuário precisa saber que ela não rodou.
      avisos: schema.validado
        ? resultado.avisos
        : [...resultado.avisos, `A validação contra o JSON Schema do TCESP não pôde ser executada (${schema.motivo ?? 'motivo desconhecido'}). O documento pode ser rejeitado no envio por problema estrutural.`],
    };
  }
}

/**
 * Códigos de domínio referenciados pela prestação, sem repetição. A validade
 * da classificação econômica é por exercício, que é o ano de emissão do
 * empenho (§17 #2) — não o ano da prestação.
 */
function codigosUsados(d: DadosMontagem): {
  cbos: string[];
  classificacoes: Array<{ codigo: string; exercicio: number }>;
} {
  const cbos = new Set<string>();
  for (const e of d.empregados) if (e.cbo) cbos.add(e.cbo);

  const classificacoes = new Map<string, { codigo: string; exercicio: number }>();
  for (const e of d.empenhos) {
    if (!e.classificacaoEconomica) continue;
    const exercicio = Number(e.dataEmissao?.slice(0, 4)) || d.ano;
    classificacoes.set(`${exercicio}|${e.classificacaoEconomica}`, {
      codigo: e.classificacaoEconomica,
      exercicio,
    });
  }

  return { cbos: [...cbos], classificacoes: [...classificacoes.values()] };
}
