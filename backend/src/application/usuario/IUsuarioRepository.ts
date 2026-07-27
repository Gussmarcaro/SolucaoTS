import type { Usuario } from '@/core/usuario/Usuario';
import type {
  ListarUsuariosParams,
  NovoUsuarioDTO,
  Paginado,
  UsuarioAuth,
} from './dtos';

/** Port de persistência de Usuário (implementado na camada de infraestrutura). */
export interface IUsuarioRepository {
  /** Busca por documento (CPF/CNPJ, apenas dígitos) — usado na trava de duplicidade. */
  buscarPorDocumento(documento: string): Promise<Usuario | null>;
  /** Busca por e-mail. */
  buscarPorEmail(email: string): Promise<Usuario | null>;
  /** Cria um novo usuário (documento normalizado; senha já em hash). */
  criar(dados: NovoUsuarioDTO): Promise<Usuario>;
  /** Lista paginada e filtrada por qualquer campo. */
  listar(params: ListarUsuariosParams): Promise<Paginado<Usuario>>;

  // ---- Autenticação ----
  /** Busca credenciais (inclui senhaHash) por e-mail — uso exclusivo do login. */
  buscarAuthPorEmail(email: string): Promise<UsuarioAuth | null>;
  /** Grava o hash do token de recuperação e sua expiração. */
  definirResetToken(id: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /** Busca por hash do token de recuperação (para validar o link). */
  buscarPorResetTokenHash(
    tokenHash: string,
  ): Promise<{ id: string; resetTokenExpiresAt: Date | null } | null>;
  /** Atualiza a senha e limpa o token de recuperação. */
  atualizarSenhaELimparReset(id: string, senhaHash: string): Promise<void>;
}
