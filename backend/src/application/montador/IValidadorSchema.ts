/**
 * Port da validação **estrutural** do documento JSON contra o schema oficial
 * do Audesp.
 *
 * É uma camada distinta das regras de negócio: o TCESP aplica o schema no
 * momento do envio e rejeita o documento antes de olhar o conteúdo. Rodar a
 * mesma validação aqui evita descobrir o problema só depois de transmitir.
 */
export interface ResultadoValidacaoSchema {
  /**
   * `false` quando a validação não pôde ser executada (schema ausente ou que
   * não compila). Nesse caso `erros` vem vazio — e isso NÃO significa
   * documento válido. Quem chama deve avisar o usuário em vez de dar por bom.
   */
  validado: boolean;
  erros: string[];
  /** Motivo, quando `validado` é `false`. */
  motivo?: string;
}

export interface IValidadorSchema {
  /** Valida o documento montado contra o schema do tipo de ajuste. */
  validar(tipoAjuste: string, documento: unknown): ResultadoValidacaoSchema;
}
