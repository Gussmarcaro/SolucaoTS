import type { Ambiente, Inconformidade } from './dtos';

export interface PrestacaoParaEnvio {
  id: string;
  ajusteId: string;
  ano: number;
  tipoAjuste: string;
  status: string;
  /** Declaração Negativa da prestação: vai por rota própria. */
  declaracaoNegativa: boolean;
  ehRetificacao: boolean;
  /** Já houve envio aceito à produção — é o que trava a edição. */
  enviadaProducao: boolean;
}

export interface NovoEnvio {
  protocolo: string;
  ambiente: Ambiente;
  retificacao: boolean;
  /** O JSON exatamente como foi transmitido. */
  documento: unknown;
}

export interface EnvioRegistrado {
  id: string;
  ambiente: Ambiente;
  protocolo: string;
  retificacao: boolean;
  hash: string;
  criadoEm: string;
  criadoPorNome: string | null;
}

export interface ITransmissaoRepository {
  carregar(prestacaoId: string): Promise<PrestacaoParaEnvio | null>;

  /** Grava o envio (com o JSON e a impressão digital) e marca a prestação como enviada. */
  registrarEnvio(prestacaoId: string, envio: NovoEnvio): Promise<void>;

  registrarStatus(
    prestacaoId: string,
    status: 'ARMAZENADO' | 'REJEITADO' | 'SUBSTITUIDO' | 'EXCLUIDO' | 'ENVIADO',
    inconformidades: Inconformidade[],
  ): Promise<void>;

  /** Exercícios posteriores do mesmo ajuste com prestação armazenada. */
  posterioresArmazenadas(ajusteId: string, ano: number): Promise<number[]>;

  /** Reabre para edição: volta a "em elaboração" com as marcas dadas. */
  reabrir(prestacaoId: string, marcas: { ehRetificacao: boolean; declaracaoNegativa: boolean }): Promise<void>;

  envios(prestacaoId: string): Promise<EnvioRegistrado[]>;
  documentoEnviado(prestacaoId: string, envioId: string): Promise<{ documento: unknown; hash: string; protocolo: string } | null>;
}
