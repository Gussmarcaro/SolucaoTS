import type { DadosPlanoItem } from '@/application/planoAplicacao/dtos';
import { normalizarMes, pareceCabecalho, parseValorBR, registrosCsv } from '@/shared/csv';

const arredonda2 = (n: number) => Math.round(n * 100) / 100;

export interface ResultadoParsePlano {
  itens: DadosPlanoItem[];
  totalLinhas: number;
  ignoradas: number;
  erros: string[];
}

/**
 * Formato: `categoria;subcategoria;ano;mes;valor;descricao?`
 * mês por nome ou número; valor em padrão BR. Linhas duplicadas (mesma
 * categoria+subcategoria+ano+mês) são somadas.
 *
 * Aceita tanto o arquivo de exemplo do TCESP (campos soltos, sem cabeçalho)
 * quanto a **exportação do próprio AUDESP**, que vem com cabeçalho, todo campo
 * entre aspas e a descrição ocupando várias linhas — ver `registrosCsv`. As
 * colunas da exportação ("Grupo de despesas" e "Categoria de despesas") caem
 * na ordem certa: viram categoria e subcategoria.
 */
export function parsePlanoAplicacao(texto: string): ResultadoParsePlano {
  const registros = registrosCsv(texto);
  const mapa = new Map<string, DadosPlanoItem>();
  const erros: string[] = [];
  let ignoradas = 0;
  // Ano e valor: as duas colunas que, não sendo número, denunciam o cabeçalho.
  const temCabecalho = registros.length > 0 && pareceCabecalho(registros[0], [2, 4]);

  registros.forEach((campos, i) => {
    const n = i + 1;
    if (i === 0 && temCabecalho) return;
    if (campos.length < 5) {
      erros.push(`Linha ${n}: colunas insuficientes (esperado ao menos 5).`);
      ignoradas++;
      return;
    }
    const categoria = campos[0].trim();
    const subcategoria = campos[1].trim();
    const ano = Number((campos[2] ?? '').trim());
    const mes = normalizarMes(campos[3] ?? '');
    const valor = parseValorBR(campos[4] ?? '');
    const descricao = (campos[5] ?? '').trim() || null;

    if (!categoria || !subcategoria) {
      erros.push(`Linha ${n}: categoria/subcategoria vazia.`);
      ignoradas++;
      return;
    }
    if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
      erros.push(`Linha ${n}: ano inválido ("${campos[2]}").`);
      ignoradas++;
      return;
    }
    if (!mes) {
      erros.push(`Linha ${n}: mês inválido ("${campos[3]}").`);
      ignoradas++;
      return;
    }
    if (valor == null || valor < 0) {
      erros.push(`Linha ${n}: valor inválido ("${campos[4]}").`);
      ignoradas++;
      return;
    }

    const chave = `${categoria}|${subcategoria}|${ano}|${mes}`;
    const existente = mapa.get(chave);
    if (existente) {
      existente.valor = arredonda2(existente.valor + valor);
      if (!existente.descricao && descricao) existente.descricao = descricao;
    } else {
      mapa.set(chave, { categoria, subcategoria, ano, mes, valor: arredonda2(valor), descricao });
    }
  });

  return { itens: [...mapa.values()], totalLinhas: registros.length, ignoradas, erros };
}
