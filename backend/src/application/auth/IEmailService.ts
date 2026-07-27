/** Port de envio de e-mail (implementado na infraestrutura). */
export interface IEmailService {
  enviarRecuperacaoSenha(params: {
    para: string;
    nome: string;
    link: string;
    validadeMinutos: number;
  }): Promise<void>;
}
