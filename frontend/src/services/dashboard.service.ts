import { http } from './http';

export type ChaveCadastro =
  | 'entidades'
  | 'fornecedores'
  | 'colaboradores'
  | 'contratos'
  | 'bens'
  | 'servidores';

export interface ContagemCadastro {
  chave: ChaveCadastro;
  total: number;
  /** Nulo quando o cadastro não tem a noção de ativo — hoje só Bens Cedidos. */
  ativos: number | null;
}

/**
 * Contagem dos cadastros, numa requisição só.
 *
 * Substitui doze chamadas que o Dashboard fazia — duas por cadastro, cada uma
 * uma listagem paginada em `pageSize: 1` da qual se aproveitava apenas o campo
 * `total`. Era mais da metade de tudo que a tela de entrada pedia.
 *
 * Vem já recortada pelo que o grupo pode ler: cadastro sem permissão
 * simplesmente não volta na lista.
 */
export async function contagensDosCadastros(): Promise<ContagemCadastro[]> {
  const { data } = await http.get<{ itens: ContagemCadastro[] }>('/dashboard/contagens');
  return data.itens;
}
