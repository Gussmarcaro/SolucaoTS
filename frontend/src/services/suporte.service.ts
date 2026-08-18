import { http } from './http';

export interface OrgaoResumo {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  usuarios: number;
}

export interface ProvisionarPayload {
  nome: string;
  cnpj: string;
  codigoMunicipio: string;
  codigoEntidade: string;
  tipoOrgao: string;
  periodicidade: string;
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

export async function listarOrgaosSuporte(): Promise<OrgaoResumo[]> {
  const { data } = await http.get<OrgaoResumo[]>('/suporte/orgaos');
  return data;
}

/** Troca o órgão atendido. Devolve um token novo — a sessão precisa adotá-lo. */
export async function atenderOrgao(
  clienteId: string,
): Promise<{ token: string; orgao: { id: string; nome: string } }> {
  const { data } = await http.post<{ token: string; orgao: { id: string; nome: string } }>(
    '/suporte/atender',
    { clienteId },
  );
  return data;
}

export async function provisionarOrgao(payload: ProvisionarPayload): Promise<ProvisionarResultado> {
  const { data } = await http.post<ProvisionarResultado>('/suporte/provisionar', payload);
  return data;
}
