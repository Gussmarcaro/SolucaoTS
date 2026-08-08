import {
  BANCO_CODIGOS,
  CATEGORIA_DESPESA_CODIGOS,
  CONTA_TIPO_CODIGOS,
  CRITERIO_SELECAO_CODIGOS,
  ESTADO_EMISSOR_CODIGOS,
  FONTE_RECURSO_CODIGOS,
  NATUREZA_CONTRATACAO_CODIGOS,
  NATUREZA_DEVOLUCAO_CODIGOS,
  ONUS_PAGAMENTO_CODIGOS,
  TIPO_DOCUMENTO_BANCARIO_CODIGOS,
  VALOR_TIPO_CODIGOS,
} from '@/core/dominio/tabelasFaseV';
import type { DadosMontagem } from './tipos';

/**
 * Confere os códigos de domínio contra as tabelas do JSON Schema oficial.
 *
 * São **erros bloqueantes**: as tabelas vêm do mesmo schema v1.14 que o TCESP
 * aplica no envio, então um código fora delas seria rejeitado de qualquer
 * forma. (A validação estrutural completa é feita pelo Ajv em
 * `AjvValidadorSchema`; esta aqui existe para apontar o registro exato — "o
 * pagamento de 10/03" em vez de `pagamentos[7]`.)
 */
export function validarDominios(d: DadosMontagem): string[] {
  const erros: string[] = [];
  const fora = (codigos: ReadonlySet<number>, valor: number | null | undefined): boolean =>
    valor != null && !codigos.has(valor);

  const invalido = (onde: string, campo: string, valor: number) =>
    erros.push(`${onde}: ${campo} ${valor} não é um código válido no schema do TCESP.`);

  for (const f of d.documentosFiscais) {
    if (fora(CATEGORIA_DESPESA_CODIGOS, f.categoriaDespesaTipo))
      invalido(`Documento fiscal ${f.numero}`, 'categoria de despesa', f.categoriaDespesaTipo);
    if (fora(ESTADO_EMISSOR_CODIGOS, f.estadoEmissor))
      invalido(`Documento fiscal ${f.numero}`, 'UF do emissor', f.estadoEmissor as number);
  }

  for (const p of d.pagamentos) {
    if (fora(FONTE_RECURSO_CODIGOS, p.fonteRecursoTipo))
      invalido('Pagamentos', 'fonte de recurso', p.fonteRecursoTipo);
    if (fora(BANCO_CODIGOS, p.banco)) invalido('Pagamentos', 'banco', p.banco as number);
  }

  for (const r of d.receitas) {
    if (fora(FONTE_RECURSO_CODIGOS, r.fonteRecursoTipo))
      invalido('Receitas', 'fonte de recurso', r.fonteRecursoTipo as number);
  }

  for (const e of d.empenhos) {
    if (fora(FONTE_RECURSO_CODIGOS, e.fonteRecursoTipo))
      invalido(`Empenho ${e.numero}`, 'fonte de recurso', e.fonteRecursoTipo);
  }

  for (const s of d.disponibilidades) {
    if (fora(CONTA_TIPO_CODIGOS, s.contaTipo)) invalido('Disponibilidades', 'tipo de conta', s.contaTipo);
    if (fora(BANCO_CODIGOS, s.banco)) invalido('Disponibilidades', 'banco', s.banco);
  }

  for (const v of d.devolucoes) {
    if (fora(NATUREZA_DEVOLUCAO_CODIGOS, v.naturezaDevolucaoTipo))
      invalido('Devoluções', 'natureza da devolução', v.naturezaDevolucaoTipo);
  }

  for (const c of d.contratos) {
    for (const n of c.naturezaContratacao) {
      if (fora(NATUREZA_CONTRATACAO_CODIGOS, n)) invalido(`Contrato ${c.numero}`, 'natureza da contratação', n);
    }
    if (fora(CRITERIO_SELECAO_CODIGOS, c.criterioSelecao))
      invalido(`Contrato ${c.numero}`, 'critério de seleção', c.criterioSelecao as number);
    if (fora(VALOR_TIPO_CODIGOS, c.valorTipo)) invalido(`Contrato ${c.numero}`, 'tipo de valor', c.valorTipo as number);
  }

  for (const r of d.repasses) {
    if (fora(TIPO_DOCUMENTO_BANCARIO_CODIGOS, r.tipoDocumentoBancario))
      invalido('Repasses', 'tipo de documento bancário', r.tipoDocumentoBancario as number);
    if (fora(BANCO_CODIGOS, r.banco)) invalido('Repasses', 'banco', r.banco as number);
  }

  for (const s of d.servidores) {
    if (fora(ONUS_PAGAMENTO_CODIGOS, s.onusPagamento))
      invalido(`Servidor cedido CPF ${s.cpf}`, 'ônus do pagamento', s.onusPagamento);
  }

  return erros;
}
