import { ACAO_LABEL, rotuloEntidade, type RegistroAuditoria } from '@/types/auditoria';

/** Escapa para CSV: aspas duplicadas e o campo entre aspas quando precisa. */
function campo(valor: unknown): string {
  const s = valor == null ? '' : String(valor);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Resume o diff numa coluna só, legível em planilha. */
function resumirAlteracoes(r: RegistroAuditoria): string {
  const dados = r.alteracoes ?? {};
  const campos = Object.entries(dados);
  if (campos.length === 0) return '';
  if ('quantidade' in dados) return `${String(dados.quantidade)} registro(s) em lote`;

  return campos
    .map(([nome, valor]) => {
      if (valor && typeof valor === 'object' && 'de' in valor && 'para' in valor) {
        const v = valor as { de: unknown; para: unknown };
        return `${nome}: ${String(v.de ?? '')} -> ${String(v.para ?? '')}`;
      }
      return `${nome}: ${typeof valor === 'object' ? JSON.stringify(valor) : String(valor ?? '')}`;
    })
    .join(' | ');
}

const CABECALHO = ['Data/hora', 'Autor', 'Cadastro', 'Registro', 'Ação', 'Alterações', 'ID do registro', 'Rota'];

/**
 * Gera e baixa o CSV da trilha.
 *
 * Separador `;` e BOM UTF-8 porque o destino é o Excel em português — sem os
 * dois, ele joga tudo numa coluna só e quebra os acentos.
 */
export function baixarCsv(registros: RegistroAuditoria[]): void {
  const linhas = registros.map((r) =>
    [
      new Date(r.ocorridoEm).toLocaleString('pt-BR'),
      r.usuarioNome,
      rotuloEntidade(r.entidade),
      r.registroDescricao ?? '',
      ACAO_LABEL[r.acao],
      resumirAlteracoes(r),
      r.registroId,
      r.rota ?? '',
    ]
      .map(campo)
      .join(';'),
  );

  const conteudo = '﻿' + [CABECALHO.join(';'), ...linhas].join('\r\n');
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
