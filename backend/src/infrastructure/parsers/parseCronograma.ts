import type { DadosCronogramaItem } from '@/application/cronograma/dtos';
import { linhasCsv, normalizarMes, parseValorBR } from '@/shared/csv';

const arredonda2 = (n: number) => Math.round(n * 100) / 100;

export interface ResultadoParseCronograma {
  itens: DadosCronogramaItem[];
  totalLinhas: number;
  ignoradas: number;
  erros: string[];
}

/**
 * Formato: `ano;mes;valor` (cada linha pode vir entre aspas).
 * mês por nome ou número; valor em padrão BR. Linhas duplicadas (mesmo
 * ano+mês) são somadas.
 */
export function parseCronograma(texto: string): ResultadoParseCronograma {
  const linhas = linhasCsv(texto);
  const mapa = new Map<string, DadosCronogramaItem>();
  const erros: string[] = [];
  let ignoradas = 0;

  linhas.forEach((linha, i) => {
    const n = i + 1;
    const campos = linha.split(';');
    if (campos.length < 3) {
      erros.push(`Linha ${n}: colunas insuficientes (esperado ano;mês;valor).`);
      ignoradas++;
      return;
    }
    const ano = Number((campos[0] ?? '').trim());
    const mes = normalizarMes(campos[1] ?? '');
    const valor = parseValorBR(campos[2] ?? '');

    if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
      erros.push(`Linha ${n}: ano inválido ("${campos[0]}").`);
      ignoradas++;
      return;
    }
    if (!mes) {
      erros.push(`Linha ${n}: mês inválido ("${campos[1]}").`);
      ignoradas++;
      return;
    }
    if (valor == null || valor < 0) {
      erros.push(`Linha ${n}: valor inválido ("${campos[2]}").`);
      ignoradas++;
      return;
    }

    const chave = `${ano}|${mes}`;
    const existente = mapa.get(chave);
    if (existente) existente.valor = arredonda2(existente.valor + valor);
    else mapa.set(chave, { ano, mes, valor: arredonda2(valor) });
  });

  return { itens: [...mapa.values()], totalLinhas: linhas.length, ignoradas, erros };
}
