import { AppError, BusinessError, NotFoundError } from '@/shared/errors';

/**
 * Operações da equipe do fornecedor — as únicas que existem fora de um órgão.
 *
 * São duas, e nenhuma delas é "ver tudo":
 *
 * - **provisionar** um cliente novo, criando o órgão e o primeiro
 *   administrador dele num passo só (sem isso, o segundo município não tem
 *   como entrar: o carimbo automático colocaria o usuário no órgão de quem o
 *   criou);
 * - **atender** um órgão, trocando explicitamente o contexto do próprio token.
 *
 * A diferença entre isto e um perfil que enxerga tudo é o que mantém o
 * isolamento de pé: o suporte continua operando **dentro de um órgão de cada
 * vez**, e o token diz qual. O que ele ganha é poder escolher — e cada escolha
 * deixa rastro.
 */

export interface OrgaoResumo {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  usuarios: number;
}

export interface ProvisionarDTO {
  /** Órgão */
  nome: string;
  cnpj: string;
  codigoMunicipio: number | string;
  codigoEntidade: number | string;
  tipoOrgao: string;
  periodicidade: string;
  /** Primeiro administrador */
  adminNome: string;
  adminEmail: string;
  adminDocumento: string;
  adminSenha: string;
}

export interface ProvisionarResultado {
  clienteId: string;
  clienteNome: string;
  usuarioId: string;
  grupoId: string;
}

export interface ISuporteRepository {
  listarOrgaos(): Promise<OrgaoResumo[]>;
  orgaoExiste(id: string): Promise<{ id: string; nome: string } | null>;
  /** Cria órgão + grupo Administrador + primeiro usuário, tudo ou nada. */
  provisionar(dados: {
    orgao: {
      nome: string;
      cnpj: string;
      codigoMunicipio: number;
      codigoEntidade: number;
      tipoOrgao: string;
      periodicidade: string;
    };
    admin: { nome: string; email: string; documento: string; senhaHash: string };
  }): Promise<ProvisionarResultado>;
  emailEmUso(email: string): Promise<boolean>;
  documentoEmUso(documento: string): Promise<boolean>;
  cnpjEmUso(cnpj: string): Promise<boolean>;
}

/** Nome do grupo criado junto com o órgão — o único com acesso no início. */
export const GRUPO_INICIAL = 'Administrador';

export class SuporteUseCases {
  constructor(private readonly repo: ISuporteRepository) {}

  /** Garante que quem chama é da equipe do fornecedor. */
  private exigirSuporte(suporte: boolean): void {
    if (!suporte) {
      // 404 em vez de 403: para quem não é do suporte, estas rotas não existem.
      // Dizer "proibido" confirmaria que há um caminho de administração global.
      throw new NotFoundError('Recurso não encontrado.');
    }
  }

  async listarOrgaos(suporte: boolean): Promise<OrgaoResumo[]> {
    this.exigirSuporte(suporte);
    return this.repo.listarOrgaos();
  }

  /**
   * Troca o órgão do contexto. Devolve o órgão escolhido; quem emite o novo
   * token é a camada de apresentação, que é quem conhece o JWT.
   */
  async atender(suporte: boolean, clienteId: string): Promise<{ id: string; nome: string }> {
    this.exigirSuporte(suporte);
    const orgao = await this.repo.orgaoExiste(clienteId);
    if (!orgao) throw new NotFoundError('Órgão não encontrado.');
    return orgao;
  }

  async provisionar(
    suporte: boolean,
    dados: ProvisionarDTO,
    hashSenha: (senha: string) => Promise<string>,
  ): Promise<ProvisionarResultado> {
    this.exigirSuporte(suporte);

    const nome = dados.nome?.trim() ?? '';
    const cnpj = (dados.cnpj ?? '').replace(/\D/g, '');
    const adminNome = dados.adminNome?.trim() ?? '';
    const adminEmail = (dados.adminEmail ?? '').trim().toLowerCase();
    const adminDocumento = (dados.adminDocumento ?? '').replace(/\D/g, '');

    if (nome.length < 3) throw new BusinessError('Informe o nome do órgão.');
    if (cnpj.length !== 14) throw new BusinessError('CNPJ do órgão inválido.');
    if (adminNome.length < 3) throw new BusinessError('Informe o nome do administrador.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail))
      throw new BusinessError('E-mail do administrador inválido.');
    if (adminDocumento.length !== 11) throw new BusinessError('CPF do administrador inválido.');
    if ((dados.adminSenha ?? '').length < 8)
      throw new BusinessError('A senha do administrador precisa de ao menos 8 caracteres.');

    const codigoMunicipio = Number(dados.codigoMunicipio);
    const codigoEntidade = Number(dados.codigoEntidade);
    if (!Number.isInteger(codigoMunicipio) || codigoMunicipio <= 0)
      throw new BusinessError('Código do município inválido.');
    if (!Number.isInteger(codigoEntidade) || codigoEntidade <= 0)
      throw new BusinessError('Código da entidade inválido.');

    // Conferidas antes da transação para o erro chegar nomeado ao usuário, em
    // vez de uma violação de unicidade crua vinda do banco.
    if (await this.repo.cnpjEmUso(cnpj)) throw new AppError('Já existe órgão com este CNPJ.', 409, 'CNPJ_DUPLICADO');
    if (await this.repo.emailEmUso(adminEmail))
      throw new AppError('Já existe usuário com este e-mail.', 409, 'EMAIL_DUPLICADO');
    if (await this.repo.documentoEmUso(adminDocumento))
      throw new AppError('Já existe usuário com este CPF.', 409, 'CPF_DUPLICADO');

    return this.repo.provisionar({
      orgao: {
        nome,
        cnpj,
        codigoMunicipio,
        codigoEntidade,
        tipoOrgao: dados.tipoOrgao,
        periodicidade: dados.periodicidade,
      },
      admin: {
        nome: adminNome,
        email: adminEmail,
        documento: adminDocumento,
        senhaHash: await hashSenha(dados.adminSenha),
      },
    });
  }
}
