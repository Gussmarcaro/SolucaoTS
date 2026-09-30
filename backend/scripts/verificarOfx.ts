/**
 * Confere o leitor de OFX e as regras de sugestão da conciliação.
 *
 * Sem banco. É a rede de proteção do pedaço mais silencioso da conciliação: um
 * valor lido errado não quebra nada — ele simplesmente deixa de casar com o
 * lançamento, e o usuário conclui que o sistema "não achou".
 *
 *   npm run verificar:ofx
 */
import { parseOfx, dataDoOfx, valorDoOfx } from '../src/infrastructure/parsers/parseOfx';
import { ehDoAjuste } from '../src/core/conciliacao/contas';
import { sugerirConciliacao } from '../src/core/conciliacao/sugerir';

const falhas: string[] = [];

function ok(descricao: string, condicao: boolean, detalhe = ''): void {
  console.log(`  ${condicao ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!condicao) falhas.push(descricao);
}

console.log('\nLeitor de OFX\n');

// --- datas ---
ok('data com fuso perde a hora', dataDoOfx('20260105120000[-3:GMT]') === '2026-01-05');
ok('data curta (só o dia)', dataDoOfx('20260105') === '2026-01-05');
ok('data inválida devolve null', dataDoOfx('2026') === null);
ok('mês fora da faixa é recusado', dataDoOfx('20261305') === null);

// --- valores ---
ok('valor com ponto decimal', valorDoOfx('-1500.00') === -1500);
ok('valor no formato brasileiro', valorDoOfx('-1.500,00') === -1500);
ok('milhar com ponto e decimal com vírgula', valorDoOfx('1.234.567,89') === 1234567.89);
ok('crédito positivo', valorDoOfx('250.50') === 250.5);
ok('valor inválido devolve null', valorDoOfx('abc') === null);

// --- arquivo completo, no dialeto SGML (tags sem fechar) ---
const OFX_1 = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>001<BRANCHID>1234<ACCTID>56789-0<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20260101<DTEND>20260131
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260105120000[-3:GMT]<TRNAMT>-1500.00<FITID>A1<MEMO>PAGTO FORNECEDOR</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260110120000[-3:GMT]<TRNAMT>50000.00<FITID>A2<MEMO>REPASSE PREFEITURA</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260112<TRNAMT>-35.90<FITID>A3<MEMO>TARIFA BANCARIA</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const r = parseOfx(Buffer.from(OFX_1, 'latin1'));
ok('lê as três transações', r.lancamentos.length === 3, `${r.lancamentos.length}`);
ok('identifica o banco', r.banco === 1, String(r.banco));
ok('identifica agência e conta', r.agencia === '1234' && r.conta === '56789-0');
ok('período do extrato', r.dataInicial === '2026-01-01' && r.dataFinal === '2026-01-31');
ok('débito tem sinal negativo', r.lancamentos[0].valor === -1500 && r.lancamentos[0].tipo === 'DEBITO');
ok('crédito é positivo', r.lancamentos[1].valor === 50000 && r.lancamentos[1].tipo === 'CREDITO');
ok('histórico preservado', r.lancamentos[0].descricao.includes('PAGTO FORNECEDOR'));
ok('sem erros no arquivo bem formado', r.erros.length === 0, r.erros.join('; '));

// --- acentuação em Windows-1252 ---
const comAcento = OFX_1.replace('PAGTO FORNECEDOR', 'TRANSFERÊNCIA ELETRÔNICA');
const rAcento = parseOfx(Buffer.from(comAcento, 'latin1'));
ok(
  'acento de extrato em Windows-1252 sobrevive',
  rAcento.lancamentos[0].descricao.includes('TRANSFERÊNCIA ELETRÔNICA'),
  rAcento.lancamentos[0].descricao,
);

// --- FITID repetido ---
const repetido = OFX_1.replace('<FITID>A2', '<FITID>A1');
const rRep = parseOfx(Buffer.from(repetido, 'latin1'));
ok('FITID repetido é recusado com aviso', rRep.lancamentos.length === 2 && rRep.erros.length === 1, rRep.erros.join('; '));

// --- arquivo que não é extrato ---
const rVazio = parseOfx(Buffer.from('<html>oi</html>'));
ok('arquivo sem transações avisa em vez de devolver vazio', rVazio.erros.length === 1);

// ---------------------------------------------------------------------------
console.log('\nSugestão de conciliação\n');

const LANC = (valor: number, data: string) => ({ valor, data });

ok(
  'casa por valor e data exatos',
  sugerirConciliacao(LANC(-1500, '2026-01-05'), [
    { id: 'p1', valor: 1500, data: '2026-01-05' },
  ])?.id === 'p1',
);

ok(
  'casa com folga de dias (compensação bancária)',
  sugerirConciliacao(LANC(-1500, '2026-01-07'), [
    { id: 'p1', valor: 1500, data: '2026-01-05' },
  ])?.id === 'p1',
);

ok(
  'não casa fora da janela',
  sugerirConciliacao(LANC(-1500, '2026-02-20'), [
    { id: 'p1', valor: 1500, data: '2026-01-05' },
  ]) === null,
);

ok(
  'não casa valor diferente',
  sugerirConciliacao(LANC(-1500, '2026-01-05'), [
    { id: 'p1', valor: 1499.99, data: '2026-01-05' },
  ]) === null,
);

/*
 * O caso que obriga a sugestão a se calar.
 *
 * Duas parcelas iguais no mesmo dia são indistinguíveis pelo par valor+data, e
 * é exatamente aí que o automático erraria — conciliando a primeira que
 * encontrasse. Errar em silêncio numa conciliação é pior que não sugerir: o
 * usuário confere o que o sistema propõe, não o que ele não propôs.
 */
ok(
  'empate não gera sugestão',
  sugerirConciliacao(LANC(-1500, '2026-01-05'), [
    { id: 'p1', valor: 1500, data: '2026-01-05' },
    { id: 'p2', valor: 1500, data: '2026-01-05' },
  ]) === null,
);

ok(
  'prefere a data mais próxima quando os valores empatam',
  sugerirConciliacao(LANC(-1500, '2026-01-05'), [
    { id: 'longe', valor: 1500, data: '2026-01-01' },
    { id: 'perto', valor: 1500, data: '2026-01-05' },
  ])?.id === 'perto',
);

// --- a linha do extrato é deste ajuste? --------------------------------------
//
// A conciliação acontece dentro de uma parceria, e o extrato não tem ajuste:
// tem banco, agência e conta por extenso. Comparar texto cru **esconderia** o
// extrato inteiro — e a tela ficaria vazia sem dizer por quê, que é o modo de
// falhar que esta tela já teve uma vez.
console.log('\n--- recorte do extrato pelas contas do ajuste ---');
{
  const contas = [{ banco: 1, agencia: 1478, conta: '123655-9' }];
  const linha = (over: Partial<{ banco: number | null; agencia: string | null; conta: string | null }> = {}) => ({
    banco: 1,
    agencia: '1478',
    conta: '123655-9',
    ...over,
  });

  ok('a mesma conta, escrita igual, casa', ehDoAjuste(linha(), contas));
  ok(
    'conta sem o traço casa',
    ehDoAjuste(linha({ conta: '1236559' }), contas),
    'o OFX traz um formato e o cadastro traz outro',
  );
  ok('agência com zeros à esquerda casa', ehDoAjuste(linha({ agencia: '0001478' }), contas));
  ok('conta com zeros à esquerda casa', ehDoAjuste(linha({ conta: '0001236559' }), contas));
  ok(
    'conta com ponto e barra casa',
    ehDoAjuste(linha({ conta: '12.365/5-9' }), contas),
    'extrato de banco formata do jeito dele',
  );

  ok('outro banco não casa', !ehDoAjuste(linha({ banco: 341 }), contas));
  ok('outra agência não casa', !ehDoAjuste(linha({ agencia: '9999' }), contas));
  ok('outra conta não casa', !ehDoAjuste(linha({ conta: '999999-9' }), contas));

  ok(
    'ajuste sem conta declarada vê tudo',
    ehDoAjuste(linha({ banco: 341, conta: '999' }), []),
    'recortar por conjunto vazio esconderia o extrato inteiro, sem explicação',
  );

  ok(
    'linha sem conta gravada não casa com conta declarada',
    !ehDoAjuste({ banco: null, agencia: null, conta: null }, contas),
  );

  const duas = [
    { banco: 1, agencia: 1478, conta: '123655-9' },
    { banco: 341, agencia: 9999, conta: '77777-7' },
  ];
  ok('com duas contas, casa com qualquer uma', ehDoAjuste(linha({ banco: 341, agencia: '9999', conta: '777777' }), duas));
  ok('e continua recusando a de fora', !ehDoAjuste(linha({ banco: 33, conta: '1' }), duas));
}


console.log(
  falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n',
);
process.exit(falhas.length ? 1 : 0);
