import axios from 'axios';
import { apenasDigitos } from '@/lib/masks';

export interface EnderecoViaCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

/**
 * Consulta o CEP na API pública ViaCEP e retorna o endereço.
 * Retorna null se o CEP for inválido ou não encontrado.
 */
export async function consultarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) return null;

  const { data } = await axios.get<ViaCepResponse>(`https://viacep.com.br/ws/${digitos}/json/`);
  if (data.erro) return null;

  return {
    logradouro: data.logradouro ?? '',
    bairro: data.bairro ?? '',
    cidade: data.localidade ?? '',
    uf: data.uf ?? '',
  };
}
