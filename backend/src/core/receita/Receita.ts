/** Entidade de domínio — Receita (bloco da prestação). */
export interface Receita {
  id: string;
  /** Órgão dono do lançamento. Nulo só nos gravados antes desta mudança. */
  clienteId: string | null;
  /** Parceria a que o lançamento pertence — antes só se alcançava pela prestação. */
  ajusteId: string | null;
  /**
   * Prestação que se apropriou deste lançamento, ou `null` enquanto nenhuma o
   * fez. A escolha é explícita, feita na aba da prestação.
   */
  prestacaoId: string | null;
  tipo: string; // REPASSE_RECEBIDO | APLIC_FINANCEIRA | OUTRA | RECURSO_PROPRIO
  descricao: string | null;
  dataPrevista: string | null;
  dataRepasse: string | null;
  fonteRecursoTipo: number | null;
  valor: number; // pode ser negativo (aplicações financeiras)
  /**
   * Identificação bancária — **controle interno, não transmitida**.
   * O bloco "receitas" do schema oficial não tem onde recebê-la; ver o
   * comentário em `prisma/schema.prisma`.
   */
  banco: number | null;
  agencia: number | null;
  contaCorrente: string | null;
  numeroTransacao: string | null;
}
