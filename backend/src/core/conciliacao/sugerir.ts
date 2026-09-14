/**
 * Sugere qual lançamento do sistema corresponde a uma linha do extrato.
 *
 * Função pura, no core, e exercitada por `verificar:ofx` sem banco — é regra de
 * negócio, não consulta.
 *
 * A sugestão é **conservadora de propósito**. Numa conciliação, errar em
 * silêncio é pior que não sugerir: o usuário confere o que o sistema propõe, e
 * não confere o que ele deixou de propor. Uma sugestão errada aceita por
 * distração some de vista para sempre.
 */

/** Dias de folga entre a data do sistema e a do extrato. */
export const JANELA_DIAS = 5;

/** Centavos de tolerância no valor. Zero: valor é chave, não aproximação. */
const TOLERANCIA = 0.005;

export interface Candidato {
  id: string;
  valor: number;
  data: string; // YYYY-MM-DD
}

const diasEntre = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;

/**
 * O candidato que corresponde, ou `null`.
 *
 * O valor é comparado em módulo: o extrato traz o débito negativo e o
 * pagamento é gravado positivo — são o mesmo dinheiro visto de dois lados.
 *
 * A janela de dias existe porque a compensação bancária atrasa: TED do dia 5
 * pode aparecer no extrato do dia 7. Sem ela, quase nada casaria; grande
 * demais, casaria o pagamento errado.
 */
export function sugerirConciliacao(
  linha: { valor: number; data: string },
  candidatos: Candidato[],
): Candidato | null {
  const alvo = Math.abs(linha.valor);

  const compativeis = candidatos.filter(
    (c) => Math.abs(Math.abs(c.valor) - alvo) < TOLERANCIA && diasEntre(c.data, linha.data) <= JANELA_DIAS,
  );

  if (!compativeis.length) return null;
  if (compativeis.length === 1) return compativeis[0];

  /*
   * Mais de um compatível: só sugere se houver um **inequivocamente** mais
   * próximo em data. Duas parcelas iguais no mesmo dia continuam sem sugestão —
   * é onde o automático erraria, e onde o humano tem a informação que falta
   * (o histórico do extrato, o número do documento).
   */
  const ordenados = [...compativeis].sort(
    (a, b) => diasEntre(a.data, linha.data) - diasEntre(b.data, linha.data),
  );
  const melhor = diasEntre(ordenados[0].data, linha.data);
  const segundo = diasEntre(ordenados[1].data, linha.data);
  return melhor < segundo ? ordenados[0] : null;
}
