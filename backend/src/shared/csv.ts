import { normalizarTexto } from './normalizar';

/**
 * Converte um valor no padrão brasileiro em número.
 * Ex.: "1.522.632,45" → 1522632.45 · "1.200" → 1200 · "0,3" → 0.3 · "100" → 100.
 * Regra BR: ponto = separador de milhar, vírgula = decimal.
 */
export function parseValorBR(bruto: string): number | null {
  const s = (bruto ?? '').trim();
  if (!s) return null;
  const normal = s.replace(/\./g, '').replace(',', '.');
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/**
 * Normaliza o mês para 1–12, aceitando número ("1", "09") ou nome
 * ("Janeiro", "maio", "MARÇO" — sem/ com acento e qualquer caixa).
 */
export function normalizarMes(bruto: string): number | null {
  const s = (bruto ?? '').trim();
  if (!s) return null;
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 12 ? n : null;
  }
  const chave = normalizarTexto(s);
  return MESES[chave] ?? null;
}

/** Converte data no padrão brasileiro 'DD/MM/AAAA' em Date (UTC). Retorna null se inválida. */
export function parseDataBR(bruto: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((bruto ?? '').trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return data;
}

// BOM UTF-8 lido como Latin-1 vira "ï»¿" (ï»¿); ou o próprio ﻿.
const BOM = /^(﻿|ï»¿)/;

/**
 * Quebra o texto em linhas não vazias, tirando um BOM inicial e as aspas que
 * envolvam a linha inteira.
 *
 * **Para arquivo de importação, prefira `registrosCsv`** — esta função quebra
 * por quebra de linha e não entende aspas, então um campo com `;` ou com texto
 * de várias linhas a engana. Continua aqui porque o gerador de domínios lê
 * publicações oficiais que não têm nem uma coisa nem outra.
 */
export function linhasCsv(texto: string): string[] {
  return texto
    .replace(BOM, '')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^"(.*)"$/, '$1'))
    .filter((l) => l.length > 0);
}

/**
 * Lê um CSV de verdade: aspas, separador dentro do campo e **quebra de linha
 * dentro do campo**.
 *
 * ## Por que não basta `split('\n')` + `split(';')`
 *
 * O arquivo que o próprio AUDESP exporta vem com **todo campo entre aspas** e
 * com a descrição ocupando várias linhas:
 *
 * ```
 * "SERVIÇOS DE TERCEIROS";"OUTROS…";"2026";"Fevereiro";"26.935,00";"1 Psicóloga — 40 horas,
 * 1 Fisioterapeuta -20 horas"
 * ```
 *
 * Quebrando por linha, a segunda metade da descrição vira um "registro" com
 * uma coluna só, e o campo `"2026"` chega ao `Number()` com as aspas — que foi
 * exatamente o que a tela mostrou: *158 linhas, 158 ignoradas*, com "ano
 * inválido (`"2026"`)" repetido. O arquivo estava certo; o leitor é que era
 * ingênuo.
 *
 * ## O que ele garante
 *
 * - aspas que envolvem o campo são removidas, e `""` dentro delas vira `"`;
 * - separador e quebra de linha **dentro** das aspas fazem parte do texto;
 * - um registro vazio (linha em branco, ou só separadores) é descartado;
 * - BOM inicial sai, venha ele como UTF-8 ou lido como Latin-1.
 *
 * **O número do registro é o número da linha na planilha.** Um campo de cinco
 * linhas continua sendo uma linha só no Excel, e é assim que ele é contado —
 * senão a mensagem de erro apontaria para uma linha que o usuário não acha.
 *
 * ## A compatibilidade que parece estranha, e não é
 *
 * O exemplo de cronograma do TCESP vem com a **linha inteira** entre aspas
 * (`"2024;ABRIL;5656"`), que pela regra do CSV é um campo só contendo
 * `2024;ABRIL;5656`. Como nenhum formato nosso tem uma coluna só, um registro
 * único que ainda contenha o separador é reaberto — é o que mantém aquele
 * arquivo (e os já importados assim) funcionando.
 */
export function registrosCsv(texto: string, separador = ';'): string[][] {
  const s = texto.replace(BOM, '');
  const registros: string[][] = [];
  let campos: string[] = [];
  let campo = '';
  let dentroDeAspas = false;

  const fecharCampo = () => {
    campos.push(campo);
    campo = '';
  };
  const fecharRegistro = () => {
    fecharCampo();
    // Registro vazio é linha em branco (ou só separadores): não é dado nem
    // erro, e contá-lo como ignorada assustaria sem motivo.
    if (campos.some((c) => c.trim() !== '')) registros.push(campos);
    campos = [];
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (dentroDeAspas) {
      if (c === '"') {
        // `""` é uma aspa literal; uma aspa sozinha fecha o campo.
        if (s[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"' && campo.trim() === '') {
      // Abre aspas só no começo do campo. Aspas no meio de texto solto
      // ("3 x 4" polegadas) são caractere comum, não delimitador.
      campo = '';
      dentroDeAspas = true;
    } else if (c === separador) {
      fecharCampo();
    } else if (c === '\r') {
      // Fica para o \n seguinte; CR sozinho (Mac clássico) encerra o registro.
      if (s[i + 1] !== '\n') fecharRegistro();
    } else if (c === '\n') {
      fecharRegistro();
    } else {
      campo += c;
    }
  }

  // O arquivo pode acabar sem quebra de linha no fim.
  if (campo !== '' || campos.length) fecharRegistro();

  return registros.map((r) =>
    r.length === 1 && r[0].includes(separador) ? r[0].split(separador) : r,
  );
}

/**
 * Converte o arquivo enviado em texto, descobrindo o encoding.
 *
 * Os três importadores liam o buffer **sempre em latin1**, porque o CSV que o
 * TCESP publica é Windows-1252 e ler em UTF-8 quebraria os acentos das
 * rubricas. Só que a exportação do próprio AUDESP é **UTF-8**: lida como
 * latin1, "VALE ALIMENTAÇÃO" vira "VALE ALIMENTAÃÃO" e a importação
 * *funciona* — grava tudo, sem erro nenhum, com a rubrica corrompida. É o pior
 * jeito de errar, porque só aparece quando alguém lê a tela.
 *
 * A decisão é por tentativa: o Node troca sequência UTF-8 inválida pelo
 * caractere de substituição (U+FFFD), então um arquivo latin1 com acento se
 * denuncia sozinho. Arquivo sem acento nenhum decodifica igual dos dois jeitos,
 * e aí tanto faz.
 */
export function textoDeCsv(buffer: Buffer): string {
  const utf8 = buffer.toString('utf8');
  return utf8.includes('�') ? buffer.toString('latin1') : utf8;
}

/**
 * O registro é a linha de cabeçalho do arquivo?
 *
 * A exportação do AUDESP traz cabeçalho ("Grupo de despesas; Categoria…"); os
 * arquivos de exemplo do TCESP, não. Em vez de exigir um ou outro, pergunta-se
 * às colunas que **têm de ser número**: se nenhuma delas é, aquela linha
 * descreve o arquivo em vez de conter dado.
 *
 * Só vale para o **primeiro** registro — no meio do arquivo, linha assim é
 * erro de verdade e precisa aparecer como tal.
 */
export function pareceCabecalho(campos: string[], colunasNumericas: number[]): boolean {
  return colunasNumericas.every((i) => {
    const v = (campos[i] ?? '').trim();
    return v !== '' && parseValorBR(v) === null;
  });
}
