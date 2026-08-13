import { BusinessError } from '@/shared/errors';

/** Porta de gravação do registro de acesso a dados pessoais. */
export interface IAcessoDadosRepository {
  registrar(dados: { entidade: string; descricao: string }): Promise<void>;
}

/**
 * Registra que alguém revelou dados pessoais mascarados na tela.
 *
 * A LGPD (art. 37) obriga o controlador a manter registro das operações de
 * tratamento — e "consultar dado pessoal" é tratamento (art. 5º, X). Como as
 * telas passaram a mascarar CPF e afins, o momento em que alguém pede para ver
 * o dado é justamente o evento que precisa ficar registrado.
 *
 * Vai para a mesma trilha das alterações, com ação VISUALIZACAO: quem consulta
 * a auditoria vê "quem alterou" e "quem olhou" no mesmo lugar, na mesma linha
 * do tempo.
 */
export class RegistrarAcessoDadosUseCase {
  constructor(private readonly repo: IAcessoDadosRepository) {}

  async execute(input: { entidade?: string; tela?: string }): Promise<void> {
    const entidade = input.entidade?.trim();
    if (!entidade) throw new BusinessError('Informe a entidade consultada.');

    const tela = input.tela?.trim();
    await this.repo.registrar({
      entidade,
      descricao: tela ? `Dados pessoais exibidos em ${tela}` : 'Dados pessoais exibidos',
    });
  }
}
