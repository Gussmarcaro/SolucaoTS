import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import { BusinessError, NotFoundError } from '@/shared/errors';

/**
 * Teto da foto **depois** do recorte que a tela faz.
 *
 * Baixo de propósito, e é o número que mais importa deste módulo: a foto não
 * é um anexo que se abre uma vez — ela carrega em toda tela, na barra
 * superior. Uma foto de celular tem 4 MB; reduzida a 256×256 no navegador,
 * fica em 20–40 KB. Este limite existe para recusar quem burlar o recorte,
 * não para acomodá-lo.
 */
export const TAMANHO_MAXIMO_FOTO = 512 * 1024;

/** Formatos que todo navegador desenha. HEIC fica de fora: o Chrome não exibe. */
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

/** Casos de uso pontuais de Usuário: (in)ativação (soft delete) e a foto. */
export class GerenciarUsuarioUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async definirAtivo(id: string, ativo: boolean): Promise<Usuario> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Usuário não encontrado.');
    return this.repo.definirAtivo(id, ativo);
  }

  /**
   * Grava a foto do usuário.
   *
   * `buscarPorId` antes de gravar não é cerimônia: ele passa pelo recorte por
   * órgão, então um id de outro cliente "não existe" — e a gravação não
   * acontece. Sem isso, o `update` alcançaria o registro pela chave.
   */
  async salvarFoto(id: string, foto: { conteudo: Buffer; tipo: string }): Promise<Usuario> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Usuário não encontrado.');

    if (!TIPOS_FOTO.includes(foto.tipo))
      throw new BusinessError('Envie uma imagem JPG, PNG ou WebP.');
    if (!foto.conteudo.length) throw new BusinessError('O arquivo está vazio.');
    if (foto.conteudo.length > TAMANHO_MAXIMO_FOTO)
      throw new BusinessError('A imagem excede 512 KB. Escolha uma foto menor.');

    await this.repo.salvarFoto(id, foto);
    return (await this.repo.buscarPorId(id))!;
  }

  async obterFoto(id: string) {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Usuário não encontrado.');
    const foto = await this.repo.obterFoto(id);
    if (!foto) throw new NotFoundError('Este usuário não tem foto.');
    return foto;
  }

  async removerFoto(id: string): Promise<Usuario> {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw new NotFoundError('Usuário não encontrado.');
    await this.repo.removerFoto(id);
    return (await this.repo.buscarPorId(id))!;
  }
}
