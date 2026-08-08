/**
 * Gera os arquivos de carga das tabelas de domínio oficiais.
 *
 * Lê as publicações originais em `Documentação/` e escreve arquivos NDJSON
 * compactos em `prisma/seeds/data/`, que são versionados e consumidos pelo
 * seed (`prisma/seeds/dominios.ts`). Assim o seed não depende de planilhas
 * grandes nem do layout do repositório em produção.
 *
 * Rodar quando o TCESP/MTE publicar uma nova edição das tabelas:
 *   npm run dominios:gerar
 *
 * Fontes:
 *   · CBO 2002 (MTE) ......... cbo2002-ocupacao.csv (separador ';', Latin-1)
 *   · Classificação Econômica  TABELA-NATUREZA-DA-DESPESA-<ano>.xlsx (TCESP,
 *     "Tabela Auxiliar: Classificação Econômica da Despesa"), abas auxiliares
 *     Categoria Econômica / Grupo de Natureza / Modalidade / Elemento.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abas, lerPlanilha, lerZip } from '../src/infrastructure/parsers/xlsx';
import { linhasCsv } from '../src/shared/csv';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..');
const DOCS = resolve(RAIZ, 'Documentação');
const SAIDA = resolve(AQUI, '..', 'prisma', 'seeds', 'data');

/** Exercício da tabela de classificação econômica sendo carregada. */
const EXERCICIO = 2025;

function escrever(nome: string, registros: unknown[]): void {
  mkdirSync(SAIDA, { recursive: true });
  const conteudo = registros.map((r) => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(resolve(SAIDA, nome), conteudo, 'utf8');
  console.log(`  ✓ ${nome} — ${registros.length} registro(s)`);
}

// ---------------------------------------------------------------------------
// CBO 2002
// ---------------------------------------------------------------------------
function gerarCbo(): void {
  console.log('CBO 2002 (cbo2002-ocupacao.csv)');
  // O arquivo do MTE vem em Latin-1; ler como UTF-8 quebra os acentos.
  const texto = readFileSync(resolve(DOCS, 'cbo2002-ocupacao.csv')).toString('latin1');
  const vistos = new Set<string>();
  const registros: [string, string][] = [];

  for (const linha of linhasCsv(texto)) {
    const [codigoBruto, ...resto] = linha.split(';');
    const codigo = (codigoBruto ?? '').replace(/\D/g, '');
    const titulo = resto.join(';').trim();
    if (codigo.length !== 6 || !titulo) continue; // pula cabeçalho e lixo
    if (vistos.has(codigo)) continue;
    vistos.add(codigo);
    registros.push([codigo, titulo]);
  }
  registros.sort((a, b) => a[0].localeCompare(b[0]));
  escrever('cbo.ndjson', registros);
}

// ---------------------------------------------------------------------------
// Classificação Econômica da Despesa + tabelas auxiliares
// ---------------------------------------------------------------------------
function gerarClassificacaoEconomica(): void {
  const arquivo = `TABELA-NATUREZA-DA-DESPESA-${EXERCICIO}.xlsx`;
  console.log(`Classificação Econômica ${EXERCICIO} (${arquivo})`);
  const zip = lerZip(resolve(DOCS, arquivo));
  const planilhas = abas(zip);

  const aba = (nome: string): string[][] => {
    const caminho = planilhas.get(nome);
    if (!caminho) throw new Error(`Aba "${nome}" não encontrada em ${arquivo}`);
    return lerPlanilha(zip, caminho);
  };

  // --- tabela principal ---
  const principal = [...planilhas.keys()].find((n) => /^ND\b/.test(n));
  if (!principal) throw new Error(`Aba "ND <ano>" não encontrada em ${arquivo}`);

  const registros: unknown[] = [];
  const vistos = new Set<string>();
  let excluidos = 0;

  for (const l of aba(principal)) {
    const [categoria, grupo, modalidade, elemento, subelemento, nome] = l.map((c) => (c ?? '').trim());
    // Ignora título, cabeçalho e as linhas de legenda no rodapé.
    if (!/^\d$/.test(categoria) || !/^\d$/.test(grupo) || !nome) continue;

    const codigo =
      categoria + grupo + modalidade.padStart(2, '0') + elemento.padStart(2, '0') + subelemento.padStart(2, '0');
    if (codigo.length !== 8 || vistos.has(codigo)) continue;
    vistos.add(codigo);

    // Colunas 8/9/10 = INCLUSÃO / EXCLUSÃO / ALTERAÇÃO nesta edição da tabela.
    const marcado = (i: number) => ((l[i] ?? '').trim().toUpperCase() === 'X');
    if (marcado(9)) {
      excluidos++;
      continue; // código excluído não deve ser oferecido
    }
    const situacao = marcado(8) ? 'INCLUSAO' : marcado(10) ? 'ALTERACAO' : null;

    registros.push([
      codigo,
      categoria,
      grupo,
      modalidade.padStart(2, '0'),
      elemento.padStart(2, '0'),
      subelemento.padStart(2, '0'),
      nome,
      (l[6] ?? '').trim() || null, // escrituração: 'E' (execução) ou 'O' (só orçamento)
      ((l[7] ?? '').toUpperCase().match(/[EMC]/g) ?? []).join(''), // 'E/M/C' → 'EMC'
      situacao,
    ]);
  }
  registros.sort((a, b) => (a as string[])[0].localeCompare((b as string[])[0]));
  escrever('classificacao-economica.ndjson', registros);
  if (excluidos) console.log(`    (${excluidos} código(s) marcado(s) como excluídos foram ignorados)`);

  // --- tabelas auxiliares que compõem o código ---
  const auxiliares: [string, string][] = [
    ['CATEGORIA_ECONOMICA', 'Categoria Econômica'],
    ['GRUPO_NATUREZA', 'Grupo de Natureza'],
    ['MODALIDADE_APLICACAO', 'Modalidade de Aplicação'],
    ['ELEMENTO_DESPESA', 'Elemento de Despesa'],
  ];
  const componentes: unknown[] = [];
  for (const [tipo, nomeAba] of auxiliares) {
    for (const l of aba(nomeAba)) {
      const codigo = (l[0] ?? '').trim();
      const nome = (l[1] ?? '').trim();
      if (!/^\d{1,2}$/.test(codigo) || !nome) continue; // pula cabeçalho/linhas vazias
      componentes.push([tipo, codigo, nome]);
    }
  }
  escrever('componentes-despesa.ndjson', componentes);
}

console.log(`Gerando tabelas de domínio a partir de ${DOCS}\n`);
gerarCbo();
gerarClassificacaoEconomica();
console.log(`\nArquivos escritos em ${SAIDA}`);
