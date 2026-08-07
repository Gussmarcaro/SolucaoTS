import { http } from './http';
import type {
  CriarPrestacaoPayload,
  FiltrosPrestacao,
  Paginado,
  Prestacao,
} from '@/types/prestacao';

export async function listarPrestacoes(params: {
  filtros?: FiltrosPrestacao;
  busca?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<Paginado<Prestacao>> {
  const { filtros = {}, busca, orderBy, orderDir, page, pageSize } = params;
  const { data } = await http.get<Paginado<Prestacao>>('/prestacoes', {
    params: {
      ...filtros,
      busca: busca || undefined,
      orderBy: orderBy || undefined,
      orderDir: orderDir || undefined,
      page,
      pageSize,
    },
  });
  return data;
}

export async function buscarPrestacao(id: string): Promise<Prestacao> {
  const { data } = await http.get<Prestacao>(`/prestacoes/${id}`);
  return data;
}

export async function criarPrestacao(payload: CriarPrestacaoPayload): Promise<Prestacao> {
  const { data } = await http.post<Prestacao>('/prestacoes', payload);
  return data;
}

export async function excluirPrestacao(id: string): Promise<void> {
  await http.delete(`/prestacoes/${id}`);
}

export interface ResultadoJson {
  documento: unknown;
  avisos: string[];
}

export async function gerarJsonPrestacao(id: string): Promise<ResultadoJson> {
  const { data } = await http.get<ResultadoJson>(`/prestacoes/${id}/json`);
  return data;
}

export type Ambiente = 'PILOTO' | 'PRODUCAO';

export interface Inconformidade {
  campo?: string | null;
  mensagem: string;
}

export interface ResultadoEnvio {
  protocolo: string | null;
  aceito: boolean;
  mensagem: string | null;
  bruto: unknown;
}

export interface StatusConsulta {
  estado: string | null;
  inconformidades: Inconformidade[];
  bruto: unknown;
}

export interface CredenciaisEnvio {
  ambiente: Ambiente;
  usuario: string;
  senha: string;
}

export async function transmitirPrestacao(
  id: string,
  body: CredenciaisEnvio,
): Promise<{ envio: ResultadoEnvio; avisos: string[] }> {
  const { data } = await http.post<{ envio: ResultadoEnvio; avisos: string[] }>(`/prestacoes/${id}/transmitir`, body);
  return data;
}

export async function consultarStatusPrestacao(
  id: string,
  body: CredenciaisEnvio & { protocolo: string },
): Promise<StatusConsulta> {
  const { data } = await http.post<StatusConsulta>(`/prestacoes/${id}/consultar-status`, body);
  return data;
}
