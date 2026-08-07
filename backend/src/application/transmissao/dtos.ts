/** Ambientes da API do Audesp — NÃO se comunicam entre si. */
export type Ambiente = 'PILOTO' | 'PRODUCAO';

export interface Credenciais {
  usuario: string;
  senha: string;
}

/** Uma inconformidade retornada pela API (quando Rejeitado). */
export interface Inconformidade {
  campo?: string | null;
  mensagem: string;
}

/** Resultado do POST de envio (multipart documentoJSON). */
export interface ResultadoEnvio {
  protocolo: string | null;
  aceito: boolean; // recebeu protocolo sem erro de schema
  mensagem: string | null;
  bruto: unknown; // resposta crua da API (auditoria/depuração)
}

/** Resultado do GET /f5/consulta. */
export interface StatusConsulta {
  estado: string | null; // Armazenado | Rejeitado | Substituído | Excluído | ...
  inconformidades: Inconformidade[];
  bruto: unknown;
}
