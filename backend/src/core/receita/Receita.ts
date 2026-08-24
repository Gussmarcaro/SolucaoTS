/** Entidade de domínio — Receita (bloco da prestação). */
export interface Receita {
  id: string;
  prestacaoId: string;
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
