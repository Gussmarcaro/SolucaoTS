/**
 * Confere a tabela de entidades do Audesp. Sem banco — lê o NDJSON gerado.
 *
 * O par (código do município, código da entidade) vai no descritor de **todo**
 * documento transmitido. Um par errado não quebra tela nenhuma: o cadastro
 * salva, a prestação monta, e a recusa só aparece no envio ao TCESP, como
 * "ajuste não encontrado" — longe o bastante da causa para ninguém ligar as
 * duas coisas.
 *
 * Por isso a carga é conferida aqui, e não no olho: o arquivo é regerado a cada
 * edição nova da planilha do TCESP (`npm run dominios:gerar`), e é nesse momento
 * que uma mudança de layout passaria despercebida.
 *
 *   npm run verificar:entidades
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ARQUIVO = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'prisma',
  'seeds',
  'data',
  'entidades-audesp.ndjson',
);

const falhas: string[] = [];
const conferir = (descricao: string, ok: boolean, detalhe = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
};

type Linha = [number, number, string, string, string | null, string | null];

const linhas: Linha[] = readFileSync(ARQUIVO, 'utf8')
  .split('\n')
  .filter((l) => l.trim().length > 0)
  .map((l) => JSON.parse(l) as Linha);

/** Sem acento, sem caixa e sem separador — como no gerador. */
const chave = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

console.log(`\nEntidades do Audesp (${linhas.length} registro(s))\n`);

// --- forma do arquivo ---------------------------------------------------
console.log('Forma do arquivo');
conferir('tem registro', linhas.length > 1000, `${linhas.length} linha(s)`);
conferir(
  'toda linha tem seis campos',
  linhas.every((l) => Array.isArray(l) && l.length === 6),
);
conferir(
  'códigos dentro da faixa do schema (município 1–9999, entidade 1–99999)',
  linhas.every(
    ([m, e]) => Number.isInteger(m) && m >= 1 && m <= 9999 && Number.isInteger(e) && e >= 1 && e <= 99999,
  ),
);
conferir(
  'nomes preenchidos',
  linhas.every(([, , nm, ne]) => typeof nm === 'string' && nm.length > 1 && typeof ne === 'string' && ne.length > 1),
);

const pares = new Set(linhas.map(([m, e]) => `${m}-${e}`));
conferir('o par município+entidade não se repete', pares.size === linhas.length, `${pares.size} par(es)`);

// --- cobertura ----------------------------------------------------------
// São Paulo tem 645 municípios, e a planilha do TCESP traz todos. Menos do que
// isso quer dizer que a leitura perdeu linhas — o tipo de defeito que uma
// mudança de layout da planilha provoca sem erro nenhum.
console.log('\nCobertura');
const municipios = new Set(linhas.map(([m]) => m));
conferir('os 645 municípios de SP', municipios.size === 645, `${municipios.size} município(s)`);

const prefeituras = linhas.filter(([, , , ne]) => /^PREFEITURA/.test(chave(ne)));
const camaras = linhas.filter(([, , , ne]) => /^CAMARA/.test(chave(ne)));

/*
 * 644, não 645: a capital não entra. O município de São Paulo é jurisdicionado
 * ao **TCM-SP**, não ao TCESP, e por isso não presta contas no Audesp. O código
 * 7107 existe na tabela, mas só com os órgãos estaduais sediados na capital.
 */
conferir('644 prefeituras (os municípios do TCESP, sem a capital)', prefeituras.length === 644, `${prefeituras.length}`);
conferir('644 câmaras', camaras.length === 644, `${camaras.length}`);

/*
 * A razão de ser desta tabela, dita como teste.
 *
 * A prefeitura e a câmara ocupam os códigos 1 e 2 do município — mas **não há
 * regra sobre qual é qual**: em 25 municípios a ordem é invertida (Araçatuba,
 * por exemplo, tem a câmara como 1 e a prefeitura como 2). Quem deduzisse o
 * código pelo tipo de órgão acertaria em 619 e erraria em 25, e o erro só
 * apareceria na recusa do envio. O par se consulta, nunca se calcula.
 */
const ocupamUmOuDois = [...prefeituras, ...camaras].every(([, e]) => e === 1 || e === 2);
conferir('prefeitura e câmara ocupam os códigos 1 e 2 do município', ocupamUmOuDois);

const invertidos = prefeituras.filter(([, e]) => e === 2).length;
conferir(
  'em parte dos municípios a ordem é invertida — por isso o par não se deduz',
  invertidos > 0 && invertidos < prefeituras.length,
  `${prefeituras.length - invertidos} com prefeitura=1, ${invertidos} com prefeitura=2`,
);

// --- classificação ------------------------------------------------------
console.log('\nTipo de órgão e periodicidade');
const TIPOS = new Set([
  'PREFEITURA_MUNICIPAL',
  'CAMARA',
  'AUTARQUIA_MUNICIPAL',
  'CONSORCIO_MUNICIPAL',
  'FUNDACAO_MUNICIPAL',
  'FUNDO_PREVIDENCIA_MUNICIPAL',
  'EMPRESA_PUBLICA',
  'UNIDADE_SECRETARIA',
]);
conferir(
  'todo tipo gravado existe no enum TipoOrgao',
  linhas.every(([, , , , t]) => t === null || TIPOS.has(t)),
);
conferir(
  'toda periodicidade gravada é ANUAL ou QUADRIMESTRAL',
  linhas.every(([, , , , , p]) => p === null || p === 'ANUAL' || p === 'QUADRIMESTRAL'),
);
conferir(
  'tipo e periodicidade andam juntos (ou os dois, ou nenhum)',
  linhas.every(([, , , , t, p]) => (t === null) === (p === null) || (t === null && p !== null)),
  'tipo nulo com periodicidade é aceito: a entidade é estadual e o enum não a cobre',
);

/*
 * As duas afirmações que o formulário repete para o usuário. Vieram da lista
 * oficial da Fase V e foram conferidas em 609 prefeituras e 612 câmaras na
 * edição de 2026 — aqui elas viram condição de carga.
 */
conferir(
  'prefeitura é sempre PREFEITURA_MUNICIPAL / QUADRIMESTRAL',
  prefeituras.every(([, , , , t, p]) => t === 'PREFEITURA_MUNICIPAL' && p === 'QUADRIMESTRAL'),
);
conferir(
  'câmara é sempre CAMARA / ANUAL',
  camaras.every(([, , , , t, p]) => t === 'CAMARA' && p === 'ANUAL'),
);

const classificadas = linhas.filter(([, , , , t]) => t !== null).length;
console.log(`\n  ${classificadas} de ${linhas.length} entidade(s) com tipo de órgão.`);

// --- amostra ------------------------------------------------------------
console.log('\nAmostra (Itajobi, do chamado que originou a tabela)');
const itajobi = linhas.filter(([m]) => m === 6539);
conferir('Itajobi está na tabela', itajobi.length > 0, `${itajobi.length} entidade(s)`);
for (const [m, e, , ne, t, p] of itajobi) console.log(`        ${m}/${e}  ${ne}  ${t ?? '—'} ${p ?? ''}`);
conferir(
  'não existe entidade 65391 em Itajobi (o código montado à mão)',
  !pares.has('6539-65391'),
);

console.log(
  falhas.length === 0
    ? '\nTudo ok.\n'
    : `\n${falhas.length} falha(s):\n${falhas.map((f) => `  · ${f}`).join('\n')}\n`,
);
process.exit(falhas.length === 0 ? 0 : 1);
