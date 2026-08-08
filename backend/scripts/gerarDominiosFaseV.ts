/**
 * Gera as tabelas de domínio da Fase V a partir do **JSON Schema oficial do
 * Audesp**, a fonte canônica dos códigos aceitos no envio.
 *
 * Escreve dois arquivos, para não haver transcrição manual (e portanto erro):
 *   · frontend/src/lib/dominiosFaseV.ts ....... códigos + rótulos (selects)
 *   · backend/src/core/dominio/tabelasFaseV.ts  só os códigos (validação)
 *
 * Rodar quando o TCESP publicar uma nova versão dos schemas:
 *   npm run dominios:fase-v
 *
 * Os schemas ficam em `src/infrastructure/tcesp/schemas/` (versionados, porque
 * a API também os usa para validar o documento antes de transmitir).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS_DIR, TIPOS_AJUSTE, arquivoSchema } from '../src/infrastructure/tcesp/schemas';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(AQUI, '..');
const FRONTEND = resolve(BACKEND, '..', 'frontend');

/** Versão dos schemas usados nesta geração (aparece no cabeçalho dos arquivos). */
const VERSAO = 'v1.14';

interface Tabela {
  /** Nome da constante gerada. */
  constante: string;
  /** Nome do campo no schema (última parte do caminho). */
  campo: string;
  /** Comentário acima da constante. */
  doc: string;
}

const TABELAS: Tabela[] = [
  { constante: 'CATEGORIA_DESPESA', campo: 'categoria_despesas_tipo', doc: 'Documentos fiscais — `categoria_despesas_tipo`.' },
  { constante: 'FONTE_RECURSO', campo: 'fonte_recurso_tipo', doc: 'Pagamentos, Receitas, Empenhos e Ajustes de Saldo — `fonte_recurso_tipo`.\nA série 91–98 repete a 1–8 para recursos de exercícios anteriores.' },
  { constante: 'ESTADO_EMISSOR', campo: 'estado_emissor', doc: 'Documentos fiscais — `estado_emissor` (UF do emissor).' },
  { constante: 'NATUREZA_CONTRATACAO', campo: 'natureza_contratacao', doc: 'Contratos — `natureza_contratacao` (aceita vários códigos por contrato).' },
  { constante: 'CRITERIO_SELECAO', campo: 'criterio_selecao', doc: 'Contratos — `criterio_selecao`.' },
  { constante: 'VALOR_TIPO', campo: 'valor_tipo', doc: 'Contratos — `valor_tipo`.' },
  { constante: 'VIGENCIA_TIPO', campo: 'vigencia_tipo', doc: 'Contratos — `vigencia_tipo`.' },
  { constante: 'CONTA_TIPO', campo: 'conta_tipo', doc: 'Disponibilidades — `conta_tipo`.' },
  { constante: 'NATUREZA_DEVOLUCAO', campo: 'natureza_devolucao_tipo', doc: 'Devoluções — `natureza_devolucao_tipo`.' },
  { constante: 'TIPO_DOCUMENTO_BANCARIO', campo: 'tipo_documento_bancario', doc: 'Repasses — `tipo_documento_bancario`.' },
  { constante: 'ONUS_PAGAMENTO', campo: 'onus_pagamento', doc: 'Servidores cedidos — `onus_pagamento`.' },
  { constante: 'DOCUMENTO_TIPO_COD', campo: 'documento_tipo', doc: '`documento_tipo` como código numérico. Na maioria dos blocos esse campo é\num enum do Prisma (ver `TIPO_DOCUMENTO` em `dominios.ts`); nos Ajustes de\nSaldo, que guardam arrays Json crus, é gravado como número.' },
  { constante: 'MEIO_PAGAMENTO_COD', campo: 'meio_pagamento_tipo', doc: '`meio_pagamento_tipo` como código numérico (mesma observação acima).' },
  { constante: 'BANCO', campo: 'banco', doc: 'Bancos aceitos em Pagamentos, Disponibilidades e Repasses.' },
];

type Opcao = { valor: number; rotulo: string };

/**
 * Varre um schema recolhendo `enum` + `examples`. Os rótulos vêm dos exemplos
 * no formato "1 = NOME" ou "1=NOME"; o código do exemplo é conferido contra o
 * enum para garantir que a ordem casa.
 */
function coletar(schema: unknown): Map<string, Opcao[]> {
  const achados = new Map<string, Opcao[]>();

  const visitar = (no: unknown, caminho: string): void => {
    if (!no || typeof no !== 'object') return;
    const obj = no as Record<string, unknown>;

    if (Array.isArray(obj.enum) && Array.isArray(obj.examples)) {
      const campo = caminho.split('.').pop()?.replace(/\[\]$/, '') ?? '';
      const valores = obj.enum as unknown[];
      const exemplos = obj.examples as unknown[];
      if (valores.length === exemplos.length && valores.every((v) => typeof v === 'number')) {
        const opcoes: Opcao[] = [];
        valores.forEach((valor, i) => {
          const m = /^\s*(\d+)\s*=\s*(.+?)\s*$/.exec(String(exemplos[i]));
          if (!m) throw new Error(`Exemplo em formato inesperado em ${caminho}: ${String(exemplos[i])}`);
          if (Number(m[1]) !== valor) {
            throw new Error(`Rótulo fora de ordem em ${caminho}: enum ${String(valor)} ≠ exemplo ${m[1]}`);
          }
          opcoes.push({ valor: valor as number, rotulo: m[2] });
        });
        // Vários blocos repetem o mesmo domínio; fica o de maior cobertura.
        const atual = achados.get(campo);
        if (!atual || opcoes.length > atual.length) achados.set(campo, opcoes);
      }
    }

    for (const [chave, valor] of Object.entries(obj)) {
      if (chave === 'properties' || chave === '$defs') {
        for (const [nome, sub] of Object.entries(valor as Record<string, unknown>)) {
          visitar(sub, caminho ? `${caminho}.${nome}` : nome);
        }
      } else if (chave === 'items') {
        visitar(valor, `${caminho}[]`);
      } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        visitar(valor, caminho);
      }
    }
  };

  visitar(schema, '');
  return achados;
}

const aspas = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const cabecalho = (extra: string) => `/**
 * Tabelas de domínio do documento JSON da prestação de contas (Fase V).
 *
 * **GERADO AUTOMATICAMENTE — não edite à mão.** Rode \`npm run dominios:fase-v\`
 * no backend após atualizar os schemas em \`src/infrastructure/tcesp/schemas/\`.
 *
 * Fonte: JSON Schema oficial do Audesp, versão ${VERSAO} — a mesma que o TCESP
 * usa para validar o documento no envio. Portanto código fora destas tabelas é
 * rejeitado na transmissão, e aqui é tratado como **erro**, não aviso.
${extra} */
`;

function gerarFrontend(tabelas: Map<string, Opcao[]>): void {
  const partes: string[] = [
    cabecalho(' *\n * Os rótulos são os do próprio schema (campo `examples`).\n'),
    "import type { Opcao } from './dominios';",
    '',
  ];

  for (const t of TABELAS) {
    const opcoes = tabelas.get(t.campo);
    if (!opcoes) throw new Error(`Domínio "${t.campo}" não encontrado nos schemas.`);
    partes.push(`/** ${t.doc.split('\n').join('\n * ')} */`);
    partes.push(`export const ${t.constante}: Opcao[] = [`);
    for (const o of opcoes) {
      partes.push(`  { value: '${o.valor}', label: ${aspas(o.rotulo)} },`);
    }
    partes.push('];', '');
  }

  partes.push(
    '/** Códigos "Outros", que exigem a descrição no campo livre correspondente. */',
    'export const NATUREZA_CONTRATACAO_OUTROS = 23;',
    'export const CRITERIO_SELECAO_OUTROS = 4;',
    'export const TIPO_DOCUMENTO_BANCARIO_OUTROS = 2;',
    '',
    '/** Rótulo de um código, para exibição em grades. Vazio quando não há valor. */',
    'export function rotulo(tabela: Opcao[], codigo: number | string | null | undefined): string {',
    "  if (codigo == null || codigo === '') return '';",
    '  const achado = tabela.find((o) => o.value === String(codigo));',
    '  return achado ? achado.label : `${codigo} (código inválido)`;',
    '}',
    '',
  );

  const destino = resolve(FRONTEND, 'src', 'lib', 'dominiosFaseV.ts');
  writeFileSync(destino, partes.join('\n'), 'utf8');
  console.log(`  ✓ ${destino}`);
}

function gerarBackend(tabelas: Map<string, Opcao[]>): void {
  const partes: string[] = [
    cabecalho(
      ' *\n * Só os códigos: os rótulos ficam no front (`lib/dominiosFaseV.ts`), gerado\n * pelo mesmo script a partir do mesmo schema.\n',
    ),
  ];

  for (const t of TABELAS) {
    const opcoes = tabelas.get(t.campo);
    if (!opcoes) throw new Error(`Domínio "${t.campo}" não encontrado nos schemas.`);
    const nome = `${t.constante}_CODIGOS`;
    partes.push(`/** ${t.doc.split('\n').join('\n * ')} */`);
    // Listas longas quebradas em linhas de largura razoável.
    const numeros = opcoes.map((o) => o.valor);
    const linhas: string[] = [];
    for (let i = 0; i < numeros.length; i += 20) linhas.push('  ' + numeros.slice(i, i + 20).join(', ') + ',');
    partes.push(`export const ${nome}: ReadonlySet<number> = new Set([`, ...linhas, ']);', '');
  }

  partes.push(
    '/** Códigos "Outros", que exigem a descrição no campo livre correspondente. */',
    'export const NATUREZA_CONTRATACAO_OUTROS = 23;',
    'export const CRITERIO_SELECAO_OUTROS = 4;',
    'export const TIPO_DOCUMENTO_BANCARIO_OUTROS = 2;',
    '',
  );

  const destino = resolve(BACKEND, 'src', 'core', 'dominio', 'tabelasFaseV.ts');
  writeFileSync(destino, partes.join('\n'), 'utf8');
  console.log(`  ✓ ${destino}`);
}

console.log(`Lendo os schemas ${VERSAO} em ${SCHEMAS_DIR}\n`);
const juntos = new Map<string, Opcao[]>();
for (const tipo of TIPOS_AJUSTE) {
  const schema: unknown = JSON.parse(readFileSync(arquivoSchema(tipo), 'utf8'));
  for (const [campo, opcoes] of coletar(schema)) {
    const atual = juntos.get(campo);
    if (!atual || opcoes.length > atual.length) juntos.set(campo, opcoes);
  }
}
console.log(`${juntos.size} domínio(s) encontrado(s) nos ${TIPOS_AJUSTE.length} schemas.\n`);
gerarFrontend(juntos);
gerarBackend(juntos);
console.log('\nPronto. Rode o typecheck dos dois projetos.');
