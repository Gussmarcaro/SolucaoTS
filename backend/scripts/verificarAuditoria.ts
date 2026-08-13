/**
 * Confere as regras puras da trilha de auditoria — o diff e a omissão de
 * campos sensíveis. Não precisa de banco.
 *
 *   npm run verificar:auditoria
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import {
  MODELS_COM_CRIADO_POR,
  NAO_AUDITAR,
  descrever,
  diferenca,
  limpar,
} from '../src/infrastructure/database/extensaoAuditoria';

let falhas = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`   ${cond ? 'ok     ' : 'FALHOU '} ${msg}`);
  if (!cond) falhas++;
};

console.log('--- campos omitidos ---');
const bruto = {
  nome: 'Fulano',
  senhaHash: '$2a$12$segredo',
  resetTokenHash: 'abc',
  resetTokenExpiresAt: new Date(),
  buscaTexto: 'fulano',
  atualizadoEm: new Date(),
  email: 'f@x.com',
};
const limpo = limpar(bruto);
ok(!('senhaHash' in limpo), 'senhaHash nunca vai para o log');
ok(!('resetTokenHash' in limpo), 'resetTokenHash nunca vai para o log');
ok(!('resetTokenExpiresAt' in limpo), 'resetTokenExpiresAt nunca vai para o log');
ok(!('buscaTexto' in limpo), 'buscaTexto (derivado) fica de fora do diff');
ok(!('atualizadoEm' in limpo), 'atualizadoEm (muda sempre) fica de fora');
ok(limpo.nome === 'Fulano' && limpo.email === 'f@x.com', 'campos normais permanecem');

console.log('\n--- diff ---');
const d1 = diferenca({ nome: 'A', cidade: 'X' }, { nome: 'B', cidade: 'X' });
ok(Object.keys(d1).length === 1, 'só o campo alterado entra');
ok(JSON.stringify(d1.nome) === JSON.stringify({ de: 'A', para: 'B' }), 'guarda de/para');

ok(Object.keys(diferenca({ a: 1 }, { a: 1 })).length === 0, 'sem mudança = diff vazio');
ok(Object.keys(diferenca({ v: '10.50' }, { v: '10.50' })).length === 0, 'Decimal igual não vira mudança');

const dAtivo = diferenca({ ativo: true }, { ativo: false });
ok((dAtivo.ativo as { para: unknown }).para === false, 'inativação é detectável pelo campo ativo');

const dNulo = diferenca({ obs: null }, { obs: 'algo' });
ok(JSON.stringify(dNulo.obs) === JSON.stringify({ de: null, para: 'algo' }), 'null -> valor é registrado');

console.log('\n--- descrição do registro afetado ---');
ok(descrever('Fornecedor', { nome: 'Papelaria Central' }) === 'Papelaria Central', 'usa o nome quando existe');
ok(descrever('Empresa', { razaoSocial: 'ACME Ltda', nome: 'x' }) === 'ACME Ltda', 'razaoSocial tem prioridade sobre nome');
ok(descrever('DocumentoFiscal', { numero: '123' }) === 'Doc. fiscal nº 123', 'prefixo por model');
ok(descrever('ContratoFirmado', { numero: '77' }) === 'Contrato nº 77', 'prefixo do contrato');
ok(descrever('Pagamento', {}) === null, 'sem campo descritivo devolve null');
ok(descrever('Fornecedor', null) === null, 'registro nulo devolve null');
ok((descrever('BemCedido', { descricao: 'x'.repeat(300) }) ?? '').length <= 200, 'descrição longa é truncada');

/*
 * Autoria da inclusão nos cadastros novos.
 *
 * A trilha não registra inclusão — a autoria vive no campo `criadoPor` do
 * próprio registro. Um cadastro criado sem esse campo perde a autoria em
 * silêncio: nada quebra, ninguém percebe, e o dado só faz falta numa
 * fiscalização. Esta conferência é o que avisa na hora.
 *
 * O critério é "aparece como lista em algum pai", que é o mesmo de grade de
 * registros. Blocos 1:1 da prestação e tabelas de ligação ficam de fora.
 */
console.log('\n--- criadoPor nas grades de registros ---');

const FORA_DA_REGRA = new Set([
  'RegistroAuditoria', // append-only, não se audita
  'Cbo',
  'ClassificacaoEconomica',
  'ComponenteDespesa', // tabelas de domínio, carregadas por seed
  'UsuarioGrupo',
  'GrupoUsuarioPermissao', // ligações do RBAC, não são registros de cadastro
]);

const emLista = new Set<string>();
for (const m of Prisma.dmmf.datamodel.models)
  for (const f of m.fields) if (f.kind === 'object' && f.isList) emLista.add(f.type);

const semAutoria = Prisma.dmmf.datamodel.models
  .filter((m) => !FORA_DA_REGRA.has(m.name) && emLista.has(m.name))
  .filter((m) => !m.fields.some((f) => f.name === 'criadoPor'))
  .map((m) => m.name);

ok(
  semAutoria.length === 0,
  semAutoria.length
    ? `models em grade sem criadoPor: ${semAutoria.join(', ')} — acrescente o campo ou justifique em FORA_DA_REGRA`
    : `todas as ${MODELS_COM_CRIADO_POR.size} grades registram quem incluiu`,
);

/*
 * Rótulo de cada cadastro no filtro da auditoria.
 *
 * O filtro lista todo model auditável. Sem rótulo, a opção aparece com o nome
 * cru do banco — "DocumentoRegularidade" no meio de "Entidade beneficiária" —
 * e quem opera não reconhece o que está escolhendo.
 */
console.log('\n--- rótulos do filtro de auditoria ---');

const mapa = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'src', 'types', 'auditoria.ts'),
  'utf8',
);

const semRotulo = Prisma.dmmf.datamodel.models
  .map((m) => m.name)
  .filter((nome) => !NAO_AUDITAR.has(nome))
  .filter((nome) => !new RegExp(`^\\s+${nome}:`, 'm').test(mapa));

ok(
  semRotulo.length === 0,
  semRotulo.length
    ? `sem rótulo em ENTIDADE_LABEL: ${semRotulo.join(', ')}`
    : 'todo cadastro auditável tem rótulo legível',
);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo ok.');
process.exit(falhas ? 1 : 0);
