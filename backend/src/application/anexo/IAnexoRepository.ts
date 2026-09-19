import type { Anexo, ArquivoAnexo, DonoAnexo, TipoAnexo } from '@/core/anexo/Anexo';

/** Port de persistência dos anexos da despesa e do pagamento. */
export interface IAnexoRepository {
  listar(dono: DonoAnexo, donoId: string): Promise<Anexo[]>;
  salvar(dono: DonoAnexo, donoId: string, tipo: TipoAnexo, arquivo: ArquivoAnexo): Promise<Anexo>;
  /**
   * Lê o conteúdo conferindo o dono.
   *
   * O dono entra na consulta, e não só o id do anexo: `Anexo` é filho, o
   * recorte por órgão alcança só as raízes, e a conferência pela nota (ou pelo
   * pagamento) é o que impede um id adivinhado de atravessar o isolamento.
   */
  buscarConteudo(dono: DonoAnexo, donoId: string, anexoId: string): Promise<ArquivoAnexo | null>;
  excluir(anexoId: string): Promise<void>;
}
