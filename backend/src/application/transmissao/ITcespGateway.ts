import type { Ambiente, Credenciais, ResultadoEnvio, StatusConsulta } from './dtos';

/**
 * Port do gateway de integração com a API RESTful do Audesp (Fase V).
 * Fluxo: autenticar → enviar (multipart) → consultar protocolo.
 * A implementação vive em `infrastructure` (adapter plugável).
 */
export interface ITcespGateway {
  /** POST /login (header x-authorization: usuario:senha) → token Bearer. */
  autenticar(ambiente: Ambiente, credenciais: Credenciais): Promise<string>;

  /** POST na rota do tipo de ajuste (multipart, campo documentoJSON) → protocolo. */
  enviar(params: {
    ambiente: Ambiente;
    token: string;
    tipoAjuste: string;
    documento: unknown;
  }): Promise<ResultadoEnvio>;

  /** GET /f5/consulta?protocolo=… → estado + inconformidades. */
  consultar(params: { ambiente: Ambiente; token: string; protocolo: string }): Promise<StatusConsulta>;
}
