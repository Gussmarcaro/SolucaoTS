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
 *   · Entidades do Audesp .. codigos_audesp_-_municipios_e_entidades_-<data>
 *     .xlsx (TCESP, página do Coletor), cruzada com Fase_V_entidades.pdf, que
 *     traz o tipo de órgão e a periodicidade da Declaração Negativa.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abas, lerPlanilha, lerZip } from '../src/infrastructure/parsers/xlsx';
import { linhasCsv } from '../src/shared/csv';
import { lerClassificacaoDoXsd } from './classificacaoXsd';

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
  escrever(`classificacao-economica-${EXERCICIO}.ndjson`, registros);
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


/** Exercício anterior, lido do XSD das Tabelas Auxiliares — ver o módulo. */
function gerarClassificacaoAnterior(exercicio: number, arquivo: string): void {
  console.log(`Classificação Econômica ${exercicio} (${arquivo})`);
  const registros = lerClassificacaoDoXsd(resolve(DOCS, 'Tabelas Auxiliares', 'auxiliar', arquivo));
  escrever(`classificacao-economica-${exercicio}.ndjson`, registros);
}

// ---------------------------------------------------------------------------
// Entidades do Audesp (código do município + código da entidade)
// ---------------------------------------------------------------------------

/**
 * Duas fontes oficiais, porque nenhuma das duas sozinha basta:
 *
 *  · a **planilha de códigos** (página do Coletor) tem os 645 municípios e as
 *    ~3.300 entidades com os dois códigos — e nada além disso;
 *  · a **lista da Fase V** (`Fase_V_entidades.pdf`, página de Manuais) tem o
 *    tipo de órgão e a periodicidade da Declaração Negativa — e nenhum código.
 *
 * O par de códigos é o que vai no descritor de todo documento transmitido, e
 * errá-lo derruba o envio inteiro. Por isso o cadastro passa a escolher daqui
 * em vez de aceitar digitação livre.
 */

/** [município, entidade, nome do município, nome da entidade, tipo, periodicidade] */
type LinhaEntidade = [number, number, string, string, string | null, string | null];

/** Tipo/periodicidade de uma entidade na lista oficial da Fase V. */
interface ClasseEntidade {
  tipoOrgao: string | null;
  periodicidade: string;
}

/**
 * "Tipo de órgão" da lista da Fase V → enum `TipoOrgao` do schema.
 *
 * O enum do sistema é municipal: as entidades estaduais e a "Unidade
 * Administrativa - Autarquia" não têm correspondente e ficam com tipo nulo —
 * **mas guardam a periodicidade**, que é oficial e vale do mesmo jeito.
 *
 * Note que `Fundação Municipal Típica` (Quadrimestral) e `Fundação Municipal de
 * Apoio` (Anual) caem no mesmo `FUNDACAO_MUNICIPAL`. É a prova de que a
 * periodicidade **não pode** ser deduzida do tipo escolhido no formulário: ela
 * é um dado por entidade, não uma consequência do tipo.
 */
const TIPO_DA_LISTA: Record<string, string | null> = {
  'Prefeitura Municipal': 'PREFEITURA_MUNICIPAL',
  'Câmara': 'CAMARA',
  'Autarquia Municipal': 'AUTARQUIA_MUNICIPAL',
  'Consórcio Municipal': 'CONSORCIO_MUNICIPAL',
  'Fundação Municipal Típica': 'FUNDACAO_MUNICIPAL',
  'Fundação Municipal de Apoio': 'FUNDACAO_MUNICIPAL',
  'Economia Mista Municipal': 'EMPRESA_PUBLICA',
  'Empresa Publica Municipal': 'EMPRESA_PUBLICA',
  'Entidade de Previdência Municipal': 'FUNDO_PREVIDENCIA_MUNICIPAL',
  'Fundo de Previdência Municipal': 'FUNDO_PREVIDENCIA_MUNICIPAL',
  'Unidade de Secretaria': 'UNIDADE_SECRETARIA',
  'Unidade Administrativa - Autarquia': null,
  'Autarquia Estadual': null,
  'Fundação Estadual Típica': null,
  'Fundação Estadual Conveniada': null,
  'Economia Mista Estadual': null,
  'Entidade de Previdência Estadual': null,
};

const PERIODICIDADE_DA_LISTA: Record<string, string> = {
  Quadrimestral: 'QUADRIMESTRAL',
  Anual: 'ANUAL',
};

/**
 * As únicas deduções pelo nome que esta geração aceita.
 *
 * Não são palpite: a cada execução elas são conferidas contra a lista oficial
 * em todas as entidades que o cruzamento alcança, e a geração falha se alguma
 * discordar (ver `gerarEntidadesAudesp`). Na edição de 2026 bateram em
 * 609/609 prefeituras, 612/612 câmaras e 91/91 consórcios.
 *
 * Padrões tentadores que ficaram **de fora** por não serem puros: "SAAE/água e
 * esgoto" (autarquia em 85% e economia mista no resto), "previdência" (ora
 * Entidade, ora Fundo, ora autarquia), "fundação" (Típica é quadrimestral,
 * de Apoio é anual) e "empresa/S.A." (metade economia mista, metade pública).
 * Nesses a entidade fica sem tipo e quem cadastra escolhe — melhor um campo
 * em branco do que uma periodicidade errada, que é prazo de entrega errado.
 */
const REGRAS_NOME: { padrao: RegExp; classe: ClasseEntidade }[] = [
  {
    padrao: /^PREFEITURAMUNICIPAL|^PREFEITURADA|^PREFEITURADO/,
    classe: { tipoOrgao: 'PREFEITURA_MUNICIPAL', periodicidade: 'QUADRIMESTRAL' },
  },
  {
    padrao: /^CAMARAMUNICIPAL|^CAMARADE|^CAMARADO|^CAMARADA/,
    classe: { tipoOrgao: 'CAMARA', periodicidade: 'ANUAL' },
  },
  {
    padrao: /CONSORCIO/,
    classe: { tipoOrgao: 'CONSORCIO_MUNICIPAL', periodicidade: 'ANUAL' },
  },
];

/**
 * Chave de cruzamento entre as duas fontes: sem acento, sem caixa e **sem
 * separador**. A planilha e o PDF escrevem o mesmo órgão de formas diferentes
 * ("SECRETARIA DA EDUCACAO / DIRETORIA" × "SECRETARIA DA EDUCACAO - DIRETORIA",
 * "APARECIDA D'OESTE" × "APARECIDA DOESTE"), e só o que sobra depois de tirar
 * tudo isso casa.
 */
function chaveNome(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function tipoPeloNome(nome: string): ClasseEntidade | undefined {
  const chave = chaveNome(nome);
  return REGRAS_NOME.find((r) => r.padrao.test(chave))?.classe;
}

/**
 * Lê a lista oficial da Fase V em PDF.
 *
 * `-table` (e não `-layout`) é o que mantém as quatro colunas alinhadas; mesmo
 * assim cerca de um terço das linhas sai corrompida, porque os nomes longos das
 * unidades estaduais invadem a coluna do tipo e o texto se entrelaça. Daí a
 * leitura ser **conservadora**: só entra a linha cujo fim é exatamente uma
 * periodicidade conhecida precedida de um tipo conhecido. O resto é descartado
 * em silêncio — são unidades estaduais, que não são clientes do sistema.
 */
function lerListaFaseV(): Map<string, ClasseEntidade> {
  const pasta = mkdtempSync(join(tmpdir(), 'fasev-'));
  const saida = join(pasta, 'lista.txt');
  try {
    execFileSync('pdftotext', ['-table', '-enc', 'UTF-8', resolve(DOCS, 'Fase_V_entidades.pdf'), saida]);
    const mapa = new Map<string, ClasseEntidade>();
    for (const bruta of readFileSync(saida, 'utf8').split('\n')) {
      const linha = bruta.replace(/\f/g, '').trim();
      if (!linha || linha.startsWith('Município')) continue;
      const colunas = linha.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
      if (colunas.length < 3) continue;

      const cauda = colunas.slice(2).join(' ');
      const periodo = Object.keys(PERIODICIDADE_DA_LISTA).find((p) => cauda.endsWith(p));
      if (!periodo) continue;
      const tipo = cauda.slice(0, cauda.length - periodo.length).trim();
      if (!(tipo in TIPO_DA_LISTA)) continue;

      mapa.set(`${chaveNome(colunas[0])}|${chaveNome(colunas[1])}`, {
        tipoOrgao: TIPO_DA_LISTA[tipo],
        periodicidade: PERIODICIDADE_DA_LISTA[periodo],
      });
    }
    return mapa;
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

function gerarEntidadesAudesp(): void {
  const planilha = readdirSync(DOCS)
    .filter((n) => /^codigos_audesp_-_municipios_e_entidades_-_\d{8}\.xlsx$/.test(n))
    .sort()
    .pop();
  if (!planilha) throw new Error('Planilha de códigos do Audesp não encontrada em Documentação/.');
  console.log(`Entidades do Audesp (${planilha} + Fase_V_entidades.pdf)`);

  const oficiais = lerListaFaseV();
  const zip = lerZip(resolve(DOCS, planilha));
  const primeiraAba = [...abas(zip).values()][0];
  if (!primeiraAba) throw new Error(`Nenhuma aba encontrada em ${planilha}.`);

  // A planilha envolve os textos em apóstrofo ('Itajobi') — é a marca de texto
  // do Excel, e ela vem junto no conteúdo da célula.
  const limpar = (v: string) => (v ?? '').replace(/^'|'$/g, '').replace(/\s+/g, ' ').trim();

  const registros: LinhaEntidade[] = [];
  const pares = new Set<string>();
  const divergencias: string[] = [];
  let daLista = 0;
  let doNome = 0;

  for (const celulas of lerPlanilha(zip, primeiraAba)) {
    const nomeMunicipio = limpar(celulas[0]);
    const codigoMunicipio = Number(limpar(celulas[1]));
    const nomeEntidade = limpar(celulas[2]);
    const codigoEntidade = Number(limpar(celulas[3]));
    if (!nomeMunicipio || !nomeEntidade) continue;
    // Cabeçalho e linhas de rodapé caem aqui: não têm código numérico.
    if (!Number.isInteger(codigoMunicipio) || !Number.isInteger(codigoEntidade)) continue;
    if (codigoMunicipio < 1 || codigoMunicipio > 9999) continue;
    if (codigoEntidade < 1 || codigoEntidade > 99999) continue;

    const par = `${codigoMunicipio}-${codigoEntidade}`;
    if (pares.has(par)) continue;
    pares.add(par);

    const oficial = oficiais.get(`${chaveNome(nomeMunicipio)}|${chaveNome(nomeEntidade)}`);
    const porNome = tipoPeloNome(nomeEntidade);

    /*
     * A conferência que sustenta `REGRAS_NOME`: onde as duas fontes falam da
     * mesma entidade, elas têm de dizer a mesma coisa. Uma edição nova da lista
     * que contrarie a regra para a geração — é exatamente o momento em que a
     * dedução deixaria de ser segura, e ela não pode passar despercebida.
     */
    if (oficial && porNome) {
      if (oficial.tipoOrgao !== porNome.tipoOrgao || oficial.periodicidade !== porNome.periodicidade) {
        divergencias.push(
          `${nomeMunicipio} / ${nomeEntidade}: lista diz ${oficial.tipoOrgao}/${oficial.periodicidade}, nome diz ${porNome.tipoOrgao}/${porNome.periodicidade}`,
        );
      }
    }

    if (oficial) daLista++;
    else if (porNome) doNome++;

    const classe = oficial ?? porNome;
    registros.push([
      codigoMunicipio,
      codigoEntidade,
      nomeMunicipio,
      nomeEntidade,
      classe?.tipoOrgao ?? null,
      classe?.periodicidade ?? null,
    ]);
  }

  if (divergencias.length > 0) {
    console.error(`\n  ✗ ${divergencias.length} divergência(s) entre a lista da Fase V e a dedução pelo nome:`);
    for (const d of divergencias.slice(0, 20)) console.error(`      ${d}`);
    throw new Error('REGRAS_NOME não vale mais nesta edição — confira antes de gerar.');
  }

  registros.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  escrever('entidades-audesp.ndjson', registros);
  const municipios = new Set(registros.map((r) => r[0])).size;
  const semClasse = registros.length - daLista - doNome;
  console.log(
    `     ${municipios} município(s) · tipo e periodicidade: ${daLista} da lista da Fase V, ${doNome} pelo nome, ${semClasse} em branco`,
  );
}

console.log(`Gerando tabelas de domínio a partir de ${DOCS}\n`);
gerarCbo();
gerarClassificacaoEconomica();
gerarClassificacaoAnterior(2024, 'AUDESP_TABELASAUXILIARES_2024_A.XSD');
gerarEntidadesAudesp();
console.log(`\nArquivos escritos em ${SAIDA}`);
