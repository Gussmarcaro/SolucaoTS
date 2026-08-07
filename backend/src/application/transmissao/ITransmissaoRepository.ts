import type { Inconformidade } from './dtos';

/** Dados mínimos da prestação necessários à transmissão. */
export interface PrestacaoParaEnvio {
  id: string;
  tipoAjuste: string;
  status: string;
}

/** Port de persistência do resultado de transmissão na PrestacaoContas. */
export interface ITransmissaoRepository {
  carregar(prestacaoId: string): Promise<PrestacaoParaEnvio | null>;

  /** Registra um envio bem-sucedido (protocolo + status ENVIADO + dataEnvio). */
  registrarEnvio(prestacaoId: string, protocolo: string): Promise<void>;

  /** Atualiza o status após consulta (ARMAZENADO/REJEITADO/…) + inconformidades. */
  registrarStatus(
    prestacaoId: string,
    status: 'ARMAZENADO' | 'REJEITADO' | 'SUBSTITUIDO' | 'EXCLUIDO' | 'ENVIADO',
    inconformidades: Inconformidade[],
  ): Promise<void>;
}
