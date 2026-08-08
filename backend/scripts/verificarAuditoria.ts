/**
 * Confere as regras puras da trilha de auditoria — o diff e a omissão de
 * campos sensíveis. Não precisa de banco.
 *
 *   npm run verificar:auditoria
 */
import { diferenca, limpar } from '../src/infrastructure/database/extensaoAuditoria';

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

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo ok.');
process.exit(falhas ? 1 : 0);
