import type { DadosBemAjuste } from '@/application/bemAjuste/dtos';
import { linhasCsv, parseDataBR, parseValorBR } from '@/shared/csv';

export interface ResultadoParseBens {
  itens: DadosBemAjuste[];
  totalLinhas: number;
  ignoradas: number;
  erros: string[];
}

/**
 * Formato: `identificador;data(DD/MM/AAAA);valor;codigo`.
 * valor em padrão BR. Linhas duplicadas (mesmo identificador) são
 * desconsideradas — mantém-se a primeira ocorrência.
 */
export function parseBensCedidos(texto: string): ResultadoParseBens {
  const linhas = linhasCsv(texto);
  const mapa = new Map<string, DadosBemAjuste>();
  const erros: string[] = [];
  let ignoradas = 0;

  linhas.forEach((linha, i) => {
    const n = i + 1;
    const campos = linha.split(';');
    if (campos.length < 4) {
      erros.push(`Linha ${n}: colunas insuficientes (esperado identificador;data;valor;código).`);
      ignoradas++;
      return;
    }
    const identificador = campos[0].trim();
    const data = parseDataBR(campos[1] ?? '');
    const valor = parseValorBR(campos[2] ?? '');
    const codigo = campos[3].trim();

    if (!identificador) {
      erros.push(`Linha ${n}: identificador vazio.`);
      ignoradas++;
      return;
    }
    if (!data) {
      erros.push(`Linha ${n}: data inválida ("${campos[1]}"). Use DD/MM/AAAA.`);
      ignoradas++;
      return;
    }
    if (valor == null || valor < 0) {
      erros.push(`Linha ${n}: valor inválido ("${campos[2]}").`);
      ignoradas++;
      return;
    }
    if (!codigo) {
      erros.push(`Linha ${n}: código vazio.`);
      ignoradas++;
      return;
    }

    if (mapa.has(identificador)) {
      ignoradas++; // duplicado — mantém a primeira ocorrência
      return;
    }
    mapa.set(identificador, { identificador, data, valor: Math.round(valor * 100) / 100, codigo });
  });

  return { itens: [...mapa.values()], totalLinhas: linhas.length, ignoradas, erros };
}
