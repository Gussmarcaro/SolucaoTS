/**
 * Leitor de extrato bancário em OFX.
 *
 * Escrito aqui, como o leitor de .xlsx: OFX 1.x **não é XML** — é SGML com
 * tags que quase nunca fecham (`<TRNAMT>-150.00` e ponto), e as bibliotecas de
 * XML engasgam nisso. OFX 2.x é XML de verdade, e a mesma leitura tolerante
 * atende os dois: o que se busca é sempre "o texto entre esta tag e a próxima".
 *
 * O que os bancos brasileiros fazem de diferente, e que este leitor trata:
 *
 * - **Encoding**: o cabeçalho costuma declarar `CHARSET:1252`, e os extratos
 *   vêm em Windows-1252. Lido como UTF-8, "TRANSFERÊNCIA" vira caractere
 *   quebrado no histórico — que é justamente o campo pelo qual a pessoa
 *   reconhece o lançamento.
 * - **Data com fuso**: `20260105120000[-3:GMT]`. Interessa o dia, e só ele: a
 *   hora do lançamento bancário não concilia nada, e o fuso faria uma
 *   transação da meia-noite mudar de dia.
 * - **Valor com sinal**: débito vem negativo. O sinal é o que separa pagamento
 *   de receita, então é preservado e não normalizado.
 */

export type TipoLancamentoExtrato = 'CREDITO' | 'DEBITO';

export interface LancamentoOfx {
  /** Identificador do banco para a transação — a chave da idempotência. */
  fitId: string;
  data: string; // YYYY-MM-DD
  valor: number; // negativo = débito
  tipo: TipoLancamentoExtrato;
  descricao: string;
}

export interface ExtratoOfx {
  banco: number | null;
  agencia: string | null;
  conta: string | null;
  dataInicial: string | null;
  dataFinal: string | null;
  lancamentos: LancamentoOfx[];
  /** Linhas que não puderam ser lidas, com o motivo. */
  erros: string[];
}

/**
 * Converte o buffer em texto respeitando o charset declarado.
 *
 * O cabeçalho do OFX 1.x é texto puro antes do `<OFX>`, então dá para lê-lo em
 * latin1 sem risco e só então decidir. Quando o arquivo é UTF-8 de verdade
 * (OFX 2.x costuma ser), reler em latin1 estragaria os acentos — por isso a
 * decisão vem do cabeçalho, e não de adivinhação.
 */
export function textoDoOfx(buffer: Buffer): string {
  const inicio = buffer.subarray(0, 512).toString('latin1').toUpperCase();
  const ehUtf8 =
    inicio.includes('CHARSET:UTF-8') ||
    inicio.includes('ENCODING="UTF-8"') ||
    inicio.includes("ENCODING='UTF-8'");
  return buffer.toString(ehUtf8 ? 'utf8' : 'latin1');
}

/** O conteúdo de uma tag: tudo até o próximo `<`. Devolve `null` se não houver. */
function tag(texto: string, nome: string): string | null {
  const m = new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i').exec(texto);
  const v = m?.[1]?.trim();
  return v ? v : null;
}

/**
 * `20260105120000[-3:GMT]` → `2026-01-05`.
 *
 * Só os 8 primeiros dígitos. A hora e o fuso são descartados de propósito: a
 * conciliação é por dia, e converter o fuso faria a transação da meia-noite
 * mudar de data — criando divergência onde não há.
 */
export function dataDoOfx(valor: string | null): string | null {
  const digitos = valor?.replace(/\D/g, '') ?? '';
  if (digitos.length < 8) return null;
  const ano = digitos.slice(0, 4);
  const mes = digitos.slice(4, 6);
  const dia = digitos.slice(6, 8);
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return null;
  return `${ano}-${mes}-${dia}`;
}

/**
 * `-1.500,00` ou `-1500.00` → -1500.
 *
 * O padrão do OFX é ponto decimal, mas há banco que exporta no formato
 * brasileiro. A regra: se houver vírgula, ela é o separador decimal e o ponto é
 * milhar; sem vírgula, o ponto é decimal. Errar isto transforma R$ 1.500,00 em
 * R$ 1,50 — e o valor é metade da chave da conciliação.
 */
export function valorDoOfx(valor: string | null): number | null {
  if (!valor) return null;
  const limpo = valor.trim();
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

export function parseOfx(buffer: Buffer): ExtratoOfx {
  const texto = textoDoOfx(buffer);
  const erros: string[] = [];

  const banco = Number(tag(texto, 'BANKID')?.replace(/\D/g, '') ?? '');
  const extrato: ExtratoOfx = {
    banco: Number.isFinite(banco) && banco > 0 ? banco : null,
    agencia: tag(texto, 'BRANCHID'),
    conta: tag(texto, 'ACCTID'),
    dataInicial: dataDoOfx(tag(texto, 'DTSTART')),
    dataFinal: dataDoOfx(tag(texto, 'DTEND')),
    lancamentos: [],
    erros,
  };

  // Cada transação é um bloco STMTTRN. Quebro por bloco antes de ler as tags:
  // ler o arquivo inteiro com uma regex por campo misturaria a data de uma
  // transação com o valor da seguinte.
  const blocos = [...texto.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)].map((m) => m[1]);

  if (!blocos.length) {
    erros.push('Nenhuma transação encontrada. O arquivo é um extrato OFX?');
    return extrato;
  }

  const vistos = new Set<string>();
  blocos.forEach((bloco, i) => {
    const fitId = tag(bloco, 'FITID');
    const data = dataDoOfx(tag(bloco, 'DTPOSTED'));
    const valor = valorDoOfx(tag(bloco, 'TRNAMT'));

    if (!fitId) {
      erros.push(`Transação ${i + 1}: sem identificador (FITID).`);
      return;
    }
    if (!data) {
      erros.push(`Transação ${i + 1}: data inválida.`);
      return;
    }
    if (valor === null) {
      erros.push(`Transação ${i + 1}: valor inválido.`);
      return;
    }

    /*
     * FITID repetido dentro do mesmo arquivo.
     *
     * Acontece com banco que reaproveita o identificador, e é dado que não se
     * pode conciliar: duas linhas iguais e indistinguíveis. Melhor recusar a
     * segunda com aviso do que gravar as duas e deixar o usuário decidir qual
     * concilia — decisão que ele não tem como tomar.
     */
    if (vistos.has(fitId)) {
      erros.push(`Transação ${i + 1}: identificador repetido (${fitId}).`);
      return;
    }
    vistos.add(fitId);

    // O histórico vem em MEMO ou NAME, conforme o banco; às vezes nos dois.
    const descricao = [tag(bloco, 'MEMO'), tag(bloco, 'NAME')]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 300);

    extrato.lancamentos.push({
      fitId,
      data,
      valor,
      // O sinal decide, não a tag TRNTYPE: há banco que manda DEBIT com valor
      // positivo, e o que move a conta é o sinal.
      tipo: valor < 0 ? 'DEBITO' : 'CREDITO',
      descricao: descricao || 'Sem histórico',
    });
  });

  return extrato;
}
