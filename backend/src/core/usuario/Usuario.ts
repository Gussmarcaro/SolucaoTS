/** Entidade de domínio — representa um usuário cadastrado (sempre pessoa física). */
export interface Usuario {
  id: string;
  clienteId: string | null;
  orgaoNome: string | null; // nome do órgão (join p/ exibição — o id não diz nada a ninguém)
  grupoUsuarioId: string | null;
  grupoNome: string | null; // nome do grupo (join p/ exibição)
  nome: string;
  documento: string; // CPF, apenas dígitos
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  /**
   * Quando a foto mudou pela última vez; `null` quando não há foto.
   *
   * Não é o nome de um arquivo nem o conteúdo: é o que a tela precisa para
   * decidir entre mostrar a foto ou as iniciais **sem** pedir a imagem, e o
   * que faz a URL mudar quando a foto é trocada — sem isso o navegador
   * continuaria exibindo a antiga, do cache.
   */
  fotoVersao: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
