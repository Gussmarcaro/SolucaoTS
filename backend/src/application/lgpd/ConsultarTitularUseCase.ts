import { BusinessError } from '@/shared/errors';
import { apenasDigitos, isCPFValido } from '@/shared/validators/documento';

/** Onde o CPF apareceu e o que há de dado pessoal ali. */
export interface OcorrenciaTitular {
  /** Cadastro/bloco, no vocabulário do usuário. */
  origem: string;
  /** Model do Prisma — serve de ponte para a trilha de auditoria. */
  entidade: string;
  registroId: string;
  descricao: string;
  /** Campos pessoais presentes naquele registro. */
  dados: Record<string, string | number | null>;
}

export interface RelatorioTitular {
  cpf: string;
  encontradoEm: number;
  ocorrencias: OcorrenciaTitular[];
}

/** Porta de consulta por CPF — implementada com uma varredura no banco. */
export interface ITitularRepository {
  ocorrenciasPorCpf(cpf: string): Promise<OcorrenciaTitular[]>;
}

/**
 * Atende ao direito de acesso do titular (LGPD, art. 18, I e II): reúne, por
 * CPF, tudo que o sistema guarda sobre uma pessoa e em que cadastro está.
 *
 * Exige CPF completo e válido, não busca por nome nem por parte do número. É
 * deliberado: uma busca aberta por "Maria" transformaria a ferramenta de
 * exercício de direito numa ferramenta de vigilância, expondo terceiros
 * homônimos a quem consultasse.
 */
export class ConsultarTitularUseCase {
  constructor(private readonly repo: ITitularRepository) {}

  async execute(cpfInformado: string): Promise<RelatorioTitular> {
    const cpf = apenasDigitos(cpfInformado ?? '');
    if (!isCPFValido(cpf))
      throw new BusinessError('Informe um CPF completo e válido para consultar o titular.');

    const ocorrencias = await this.repo.ocorrenciasPorCpf(cpf);
    return { cpf, encontradoEm: ocorrencias.length, ocorrencias };
  }
}
