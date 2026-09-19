import { BusinessError, NotFoundError } from '@/shared/errors';
import type { IAnexoRepository } from './IAnexoRepository';
import type { Anexo, ArquivoAnexo, DonoAnexo, TipoAnexo } from '@/core/anexo/Anexo';
import { TIPOS_ANEXO, TIPOS_POR_DONO } from '@/core/anexo/Anexo';

/** Teto do anexo. Espelha o limite do multer na camada de entrada. */
export const TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024;

/**
 * Os arquivos da despesa e do pagamento.
 *
 * A fiscalização não pergunta "quanto foi pago" — isso o sistema já responde.
 * Ela pergunta **"cadê o documento"**, e até aqui a resposta morava numa pasta
 * de rede ou num e-mail. Guardar o arquivo junto do lançamento é o que torna a
 * prestação conferível sem sair do sistema.
 *
 * As regras valem para qualquer anexo e estão escritas uma vez só — o dono e o
 * tipo entram por parâmetro. Ver `AjusteController` para o mesmo raciocínio nos
 * dois PDFs do ajuste.
 */
export class AnexoUseCases {
  constructor(private readonly repo: IAnexoRepository) {}

  async listar(dono: DonoAnexo, donoId: string): Promise<Anexo[]> {
    return this.repo.listar(dono, donoId);
  }

  async salvar(
    dono: DonoAnexo,
    donoId: string,
    tipo: string,
    arquivo: ArquivoAnexo,
  ): Promise<Anexo> {
    if (!TIPOS_ANEXO.includes(tipo as TipoAnexo))
      throw new BusinessError('Tipo de anexo inválido.');

    /*
     * O tipo tem de fazer sentido para o dono.
     *
     * "Comprovante de pagamento" numa nota fiscal, ou "recibo" num pagamento,
     * não é variação de uso — é engano, e a tela nem oferece. Aceitar aqui
     * deixaria o anexo existir num lugar onde nenhuma tela o mostra.
     */
    if (!TIPOS_POR_DONO[dono].includes(tipo as TipoAnexo))
      throw new BusinessError('Este tipo de anexo não se aplica a este lançamento.');

    if (!arquivo.tamanho) throw new BusinessError('O arquivo está vazio.');
    if (arquivo.tamanho > TAMANHO_MAXIMO_ANEXO)
      throw new BusinessError('O arquivo excede o limite de 5 MB.');

    return this.repo.salvar(dono, donoId, tipo as TipoAnexo, arquivo);
  }

  /**
   * Lê o conteúdo — a única consulta que carrega os bytes.
   *
   * Exige o dono além do id do anexo, e não é cerimônia: `Anexo` é filho, e o
   * recorte por órgão só alcança as raízes. Pedir o dono força a conferência
   * pela nota (ou pelo pagamento), que é recortada — sem isso, um id de anexo
   * adivinhado atravessaria o isolamento entre clientes.
   */
  async baixar(dono: DonoAnexo, donoId: string, anexoId: string): Promise<ArquivoAnexo> {
    const arquivo = await this.repo.buscarConteudo(dono, donoId, anexoId);
    if (!arquivo) throw new NotFoundError('Anexo não encontrado.');
    return arquivo;
  }

  async excluir(dono: DonoAnexo, donoId: string, anexoId: string): Promise<void> {
    const existe = await this.repo.buscarConteudo(dono, donoId, anexoId);
    if (!existe) throw new NotFoundError('Anexo não encontrado.');
    await this.repo.excluir(anexoId);
  }
}
