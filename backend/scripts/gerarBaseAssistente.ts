/**
 * Gera a base de conhecimento do Assistente a partir da documentação do sistema.
 *
 * Roda em desenvolvimento e **versiona o resultado** (`src/infrastructure/
 * assistente/base/*.txt|md`), como o gerador das tabelas de domínio: o servidor
 * de produção não precisa do `pdftotext` nem dos PDFs originais.
 *
 * Três fontes, todas internas ao sistema:
 *  1. os manuais oficiais do TCESP em `Documentação/` (PDF → texto);
 *  2. a síntese de regras `REGRAS_NEGOCIO_FASE_V.md`;
 *  3. o **mapa de navegação**, extraído do próprio `navigation.ts` do frontend.
 *
 * A terceira é a que impede o assistente de inventar caminho de tela: os
 * caminhos vêm do menu real, não da memória do modelo. Se o menu mudar e este
 * script não for rodado, o assistente passa a citar um caminho que não existe —
 * por isso o cabeçalho do arquivo gerado carrega a data da extração.
 *
 *   npm run assistente:base
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..');
const DOCS = join(RAIZ, 'Documentação');
const DESTINO = join(RAIZ, 'backend', 'src', 'infrastructure', 'assistente', 'base');

/** PDF de origem → nome do arquivo de texto gerado. */
const MANUAIS: [string, string][] = [
  ['Manual da Prestacao de Contas dos Repasses ao Terceiro Setor - v1.19.pdf', 'manual-prestacao-v1.19'],
  ['Manual_Fase_V_Sistema_Audesp_Ajustes_2024_v00.pdf', 'manual-cadastro-ajustes'],
  ['Manual_Fase_V_DeclaraçãoNegativa_2024_v00.pdf', 'manual-declaracao-negativa'],
  ['Manual_Alteração_Exclusão_Fase_V_RepassesTerceiroSetor (2).pdf', 'manual-alteracao-exclusao'],
  ['Manual_ConverterExcelCSV.pdf', 'manual-converter-excel-csv'],
];

interface NoMenu {
  label: string;
  to?: string;
  children?: NoMenu[];
  grupos?: string[];
}

/**
 * Lê o array `navigation` do frontend.
 *
 * O arquivo é TypeScript com referências a ícones, então não dá para importar
 * daqui. Em vez de reescrever o menu à mão — que sairia do ar no primeiro
 * ajuste —, o literal é limpo e convertido em JSON. Qualquer falha **derruba o
 * script**: melhor não gerar do que gerar caminho errado.
 */
function lerMenu(): NoMenu[] {
  const fonte = readFileSync(join(RAIZ, 'frontend', 'src', 'lib', 'navigation.ts'), 'utf8');
  const inicio = fonte.indexOf('export const navigation');
  if (inicio < 0) throw new Error('não encontrei `export const navigation` em navigation.ts');

  // O `[` do literal, não o de `NavNode[]` na anotação de tipo.
  const abertura = fonte.indexOf('= [', inicio);
  if (abertura < 0) throw new Error('não encontrei o literal do array `navigation`');

  let corpo = fonte.slice(abertura + 2);
  corpo = corpo.slice(0, corpo.lastIndexOf(']') + 1);

  const json = corpo
    .replace(/\/\/[^\n]*/g, '') // comentários de linha
    .replace(/\bicon:\s*\w+\s*,?/g, '') // ícones são referências a componentes
    .replace(/\bgrupos:\s*GRUPOS_ADMIN/g, '"grupos": ["Administrador", "Suporte"]')
    .replace(/(\w+):/g, '"$1":') // chaves sem aspas
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1'); // vírgula sobrando

  try {
    return JSON.parse(json) as NoMenu[];
  } catch (e) {
    throw new Error(`não consegui converter o menu em JSON: ${(e as Error).message}`);
  }
}

function menuEmMarkdown(nos: NoMenu[], trilha: string[] = []): string[] {
  return nos.flatMap((no) => {
    const caminho = [...trilha, no.label];
    const restrito = no.grupos ? ` _(restrito aos grupos: ${no.grupos.join(', ')})_` : '';
    const linha = no.to ? `- **${caminho.join(' → ')}** — rota \`${no.to}\`${restrito}` : null;
    const filhos = no.children ? menuEmMarkdown(no.children, caminho) : [];
    return linha ? [linha, ...filhos] : filhos;
  });
}

function gerarMapaNavegacao(): void {
  const linhas = menuEmMarkdown(lerMenu());
  const conteudo = [
    '# Mapa de navegação do sistema Solução TS',
    '',
    `> Extraído automaticamente do menu do sistema (\`navigation.ts\`) em ${new Date().toISOString().slice(0, 10)}.`,
    '> Estes são os caminhos que existem de fato. Nenhum outro caminho deve ser afirmado.',
    '',
    '## Menu principal',
    '',
    ...linhas,
    '',
    '## Observações de acesso',
    '',
    '- Itens marcados como restritos só aparecem para os grupos indicados; o servidor também barra a rota.',
    '- O cadastro de **Empresas** está suspenso: saiu do menu, embora a rota `/empresas` continue registrada.',
    '- Dentro de **Cadastro → Ajustes Celebrados**, cada ajuste abre um dossiê com abas próprias',
    '  (Termos Aditivos, Certidões, Plano de Aplicação, Cronograma de Desembolso, Bens Cedidos,',
    '  Programas e Metas, Empenhos).',
    '- Dentro de **Cadastro → Entidades / Beneficiárias**, cada entidade abre abas: Geral, Diretoria,',
    '  Conselhos, Regularidade Fiscal / Cadastral, Qualificações e Regulamentos.',
    '- **Prestação de Contas** abre a lista de prestações; cada prestação tem os blocos exigidos pelo',
    '  manual da Fase V em abas.',
    '',
  ].join('\n');

  writeFileSync(join(DESTINO, 'sistema-navegacao.md'), conteudo, 'utf8');
  console.log(`  sistema-navegacao.md      ${linhas.length} caminhos de tela`);
}

function main(): void {
  mkdirSync(DESTINO, { recursive: true });
  console.log('Gerando a base de conhecimento do assistente…\n');

  for (const [pdf, nome] of MANUAIS) {
    const saida = join(DESTINO, `${nome}.txt`);
    // `-layout` preserva as colunas das tabelas do manual, que perdem o sentido
    // no modo corrido — várias regras da Fase V vivem em tabela.
    execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', join(DOCS, pdf), saida]);
    console.log(`  ${nome.padEnd(26)}${readFileSync(saida, 'utf8').length} caracteres`);
  }

  copyFileSync(join(DOCS, 'REGRAS_NEGOCIO_FASE_V.md'), join(DESTINO, 'regras-negocio-fase-v.md'));
  console.log('  regras-negocio-fase-v.md  (cópia da síntese de regras)');

  gerarMapaNavegacao();
  console.log('\nPronto. Não edite os arquivos gerados à mão — rode este script.');
}

main();
