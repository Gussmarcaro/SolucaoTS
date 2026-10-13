import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { IAjusteRepository } from './IAjusteRepository';
import type { AtualizarAjusteDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { normalizarEValidarAjuste } from './validarAjuste';
import { conferirTotalDoPlano, explicarPlano } from '@/core/planoAplicacao/totalDoPlano';

export class AtualizarAjusteUseCase {
  constructor(private readonly repo: IAjusteRepository) {}

  async execute(id: string, input: AtualizarAjusteDTO): Promise<Ajuste> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Ajuste não encontrado.');

    const dados = normalizarEValidarAjuste(input);

    if (!(await this.repo.entidadeExiste(dados.entidadeBeneficiariaId)))
      throw new BusinessError('Entidade beneficiária não encontrada.');

    const existente = await this.repo.buscarPorCodigo(dados.codigoAjuste);
    if (existente && existente.id !== id)
      throw new ConflictError('Já existe um ajuste com este código.', 'CODIGO_DUPLICADO');

    /*
     * O Plano de Aplicação tem de fechar com o valor do ajuste — conferido
     * **só na virada para "Enviado"**.
     *
     * O plano é montado em várias etapas, e barrar a cada gravação tornaria
     * impossível salvar o trabalho pela metade: a pessoa perderia o que digitou
     * ou inventaria números para passar pela validação, que é pior que não
     * validar. "Enviado" é o momento em que o cadastro deixa de estar em
     * elaboração — ali a conferência é devida.
     *
     * **Só na virada**, e não enquanto permanece enviado: um ajuste já marcado
     * cujo plano fique divergente por outro caminho não pode ficar impossível
     * de editar, com o usuário sem nenhuma tela por onde sair.
     *
     * Plano inexistente não barra, pelo mesmo motivo da conferência da
     * prestação: o plano é opcional hoje, e exigi-lo aqui trancaria quem opera
     * há meses sem ele.
     */
    if (dados.status === 'ENVIADO' && atual.status !== 'ENVIADO') {
      const { totalDoPlano, valorDoAjuste } = await this.repo.totaisDoPlano(id);
      const plano = conferirTotalDoPlano(totalDoPlano, valorDoAjuste);
      if (plano.situacao === 'A_MAIOR' || plano.situacao === 'A_MENOR')
        throw new BusinessError(
          `${explicarPlano(plano)} Acerte o Plano de Aplicação antes de marcar o ajuste como Enviado.`,
        );
    }

    return this.repo.atualizar(id, dados);
  }
}
