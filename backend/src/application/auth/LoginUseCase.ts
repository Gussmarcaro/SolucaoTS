import type { IUsuarioRepository } from '@/application/usuario/IUsuarioRepository';
import type { LoginDTO, LoginResultado } from './dtos';
import { AppError } from '@/shared/errors';
import { compararSenha } from '@/shared/auth/senha';
import { assinarToken, expiracaoDoToken } from '@/shared/auth/jwt';
import type { RegistrarAcessoUseCase } from '@/application/sessao/RegistrarAcessoUseCase';

// Hash bcrypt "descartável" usado para igualar o tempo de resposta quando o
// e-mail não existe (mitiga ataques de timing / enumeração de usuários).
const HASH_DUMMY = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3f9m8f8m8f8m8f8m8f8m8f8m8f8m8f8';

/** Erro genérico de credenciais — nunca revela se o e-mail existe. */
class CredenciaisInvalidasError extends AppError {
  constructor() {
    super('E-mail ou senha inválidos.', 401, 'CREDENCIAIS_INVALIDAS');
  }
}

/** De onde partiu o login — vai para o histórico de acessos. */
export interface OrigemAcesso {
  ip: string | null;
  navegador: string | null;
}

export class LoginUseCase {
  constructor(
    private readonly repo: IUsuarioRepository,
    /**
     * Registro do acesso. **Opcional**, e de propósito: o login é a porta do
     * sistema, e amarrá-lo a mais uma dependência obrigatória faria um teste de
     * autenticação precisar montar o histórico para rodar.
     */
    private readonly acessos?: RegistrarAcessoUseCase,
  ) {}

  async execute(
    { email, senha, lembrar }: LoginDTO,
    origem: OrigemAcesso = { ip: null, navegador: null },
  ): Promise<LoginResultado> {
    const emailNorm = (email ?? '').trim().toLowerCase();
    const usuario = await this.repo.buscarAuthPorEmail(emailNorm);

    // Compara sempre (mesmo sem usuário) para não vazar existência por timing.
    const hash = usuario?.senhaHash ?? HASH_DUMMY;
    const senhaOk = await compararSenha(senha ?? '', hash);

    if (!usuario || !usuario.senhaHash || !senhaOk) {
      throw new CredenciaisInvalidasError();
    }
    if (!usuario.ativo) {
      throw new AppError('Usuário inativo. Contate o administrador.', 403, 'USUARIO_INATIVO');
    }

    // O órgão entra no token no login — é o único momento em que ele é lido do
    // banco. Trocar o usuário de órgão só passa a valer no próximo login, o que
    // é aceitável: mudança de lotação é rara, e o contrário (consultar o órgão
    // a cada requisição) custaria uma ida ao banco em toda chamada da API.
    /*
     * A sessão nasce **antes** do token, porque o id dela vai dentro dele.
     *
     * A ordem tem um efeito colateral aceito de propósito: para gravar o teto
     * da sessão seria preciso já ter o token (é de lá que sai o `exp`), e para
     * ter o token seria preciso já ter a sessão. O nó se desfaz assinando duas
     * vezes — a primeira só para descobrir a expiração, a segunda com o `jti`.
     * Assinar um JWT é aritmética local; a alternativa seria reinterpretar
     * `JWT_EXPIRES` aqui e ter duas leituras da mesma duração.
     */
    const dados = {
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      grupo: usuario.grupoNome,
      cli: usuario.clienteId,
      sup: usuario.suporte,
    };
    const expiraEm = expiracaoDoToken(assinarToken(dados, !!lembrar));

    // Sem órgão não há linha a gravar: `SessaoAcesso.clienteId` é obrigatório,
    // e o registro existe para ser visto **dentro** de um órgão. Na prática só
    // alcança usuário anterior ao backfill do multi-tenant.
    const sessaoId = usuario.clienteId
      ? await this.acessos?.abrir({
          clienteId: usuario.clienteId,
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          usuarioEmail: usuario.email,
          expiraEm,
          lembrar: !!lembrar,
          ip: origem.ip,
          navegador: origem.navegador,
        })
      : null;

    const token = assinarToken({ ...dados, jti: sessaoId ?? undefined }, !!lembrar);

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        grupo: usuario.grupoNome,
        clienteId: usuario.clienteId,
        suporte: usuario.suporte,
        // Vai na sessão, não no token: o token não se reemite quando a pessoa
        // troca a foto, e o avatar ficaria velho até o próximo login — o mesmo
        // motivo pelo qual as permissões também não entram nele.
        fotoVersao: usuario.fotoVersao,
        cidade: usuario.cidade,
        uf: usuario.uf,
      },
    };
  }
}
