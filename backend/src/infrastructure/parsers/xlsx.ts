import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/**
 * Leitor mínimo de planilhas .xlsx, sem dependência externa.
 *
 * Um .xlsx é um ZIP de XMLs. Aqui lemos o ZIP com `zlib.inflateRaw` (deflate é
 * o único método usado pelo Excel além de "stored") e extraímos as células via
 * regex — suficiente para as tabelas de domínio do TCESP/STN, que são grades
 * simples de texto. Não interpreta fórmulas, datas seriais nem formatação.
 */

/** Descompacta o .xlsx em memória: nome do arquivo interno → conteúdo. */
export function lerZip(caminho: string): Map<string, Buffer> {
  const buf = readFileSync(caminho);

  // O "End of Central Directory" fica no fim do arquivo e é achado de trás
  // para frente (pode haver comentário depois dele).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`ZIP inválido (EOCD não encontrado): ${caminho}`);

  const total = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const arquivos = new Map<string, Buffer>();

  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) {
      throw new Error(`ZIP inválido (central directory): ${caminho}`);
    }
    const metodo = buf.readUInt16LE(off + 10);
    const tamComprimido = buf.readUInt32LE(off + 20);
    const tamNome = buf.readUInt16LE(off + 28);
    const tamExtra = buf.readUInt16LE(off + 30);
    const tamComentario = buf.readUInt16LE(off + 32);
    const inicioLocal = buf.readUInt32LE(off + 42);
    const nome = buf.toString('utf8', off + 46, off + 46 + tamNome);

    // Os tamanhos de nome/extra do cabeçalho local podem diferir dos do
    // central directory — os dados começam depois do cabeçalho LOCAL.
    const tamNomeLocal = buf.readUInt16LE(inicioLocal + 26);
    const tamExtraLocal = buf.readUInt16LE(inicioLocal + 28);
    const inicioDados = inicioLocal + 30 + tamNomeLocal + tamExtraLocal;
    const bruto = buf.subarray(inicioDados, inicioDados + tamComprimido);

    arquivos.set(nome, metodo === 0 ? bruto : inflateRawSync(bruto));
    off += 46 + tamNome + tamExtra + tamComentario;
  }
  return arquivos;
}

const ENTIDADES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

function desescapar(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTIDADES[m])
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)));
}

function textoDosT(xml: string): string {
  // Um <si>/<is> pode ter um <t> simples ou vários <r><t> (rich text) a concatenar.
  return (xml.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? [])
    .map((t) => desescapar(t.replace(/^<t[^>]*>/, '').replace(/<\/t>$/, '')))
    .join('');
}

function lerSharedStrings(xml: Buffer | undefined): string[] {
  if (!xml) return [];
  const texto = xml.toString('utf8');
  return (texto.match(/<si>[\s\S]*?<\/si>/g) ?? []).map(textoDosT);
}

/** Converte a referência da célula ("BC12") no índice da coluna (0-based). */
function indiceColuna(ref: string): number {
  let n = 0;
  for (const c of ref.replace(/\d+/g, '')) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Lê uma planilha do .xlsx já descompactado e devolve as linhas como arrays de
 * string (célula vazia/ausente = ''). `caminhoSheet` é o caminho interno, ex.:
 * 'xl/worksheets/sheet1.xml'.
 */
export function lerPlanilha(arquivos: Map<string, Buffer>, caminhoSheet: string): string[][] {
  const strings = lerSharedStrings(arquivos.get('xl/sharedStrings.xml'));
  const xml = arquivos.get(caminhoSheet)?.toString('utf8');
  if (!xml) throw new Error(`Planilha não encontrada no arquivo: ${caminhoSheet}`);

  const linhas: string[][] = [];
  for (const row of xml.match(/<row[^>]*>[\s\S]*?<\/row>|<row[^>]*\/>/g) ?? []) {
    const celulas: string[] = [];
    for (const c of row.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/g) ?? []) {
      const ref = /r="([A-Z]+\d+)"/.exec(c)?.[1];
      const tipo = /t="([^"]+)"/.exec(c)?.[1];
      let valor = '';
      if (tipo === 'inlineStr') {
        valor = textoDosT(c);
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1];
        if (v != null) valor = tipo === 's' ? (strings[Number(v)] ?? '') : desescapar(v);
      }
      celulas[ref ? indiceColuna(ref) : celulas.length] = valor;
    }
    // O array pode ficar esparso (colunas puladas) — preenche os buracos.
    linhas.push(Array.from(celulas, (v) => v ?? ''));
  }
  return linhas;
}

/** Mapa "nome da aba" → caminho interno da planilha. */
export function abas(arquivos: Map<string, Buffer>): Map<string, string> {
  const workbook = arquivos.get('xl/workbook.xml')?.toString('utf8') ?? '';
  const rels = arquivos.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '';

  const alvoPorRel = new Map<string, string>();
  for (const r of rels.match(/<Relationship\b[^>]*\/>/g) ?? []) {
    const id = /Id="([^"]+)"/.exec(r)?.[1];
    const alvo = /Target="([^"]+)"/.exec(r)?.[1];
    if (id && alvo && /worksheets\//.test(alvo)) {
      alvoPorRel.set(id, `xl/${alvo.replace(/^\/?xl\//, '').replace(/^\.\//, '')}`);
    }
  }

  const resultado = new Map<string, string>();
  for (const s of workbook.match(/<sheet\b[^>]*\/>/g) ?? []) {
    const nome = /name="([^"]+)"/.exec(s)?.[1];
    const rid = /r:id="([^"]+)"/.exec(s)?.[1];
    const caminho = rid ? alvoPorRel.get(rid) : undefined;
    if (nome && caminho) resultado.set(desescapar(nome), caminho);
  }
  return resultado;
}
