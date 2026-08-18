/**
 * Primeiro acesso de um banco vazio.
 *
 * Num banco zerado não existe usuário nenhum — e sem usuário não há login, sem
 * login não há token, e sem token não há como chamar `/suporte/provisionar`.
 * O sistema fica inalcançável por si mesmo. Este script quebra esse círculo, e
 * é a única coisa que cria usuário sem ninguém autenticado.
 *
 * Ele cria o **primeiro órgão**, o grupo `Administrador` dele e o primeiro
 * usuário — já com a marca de **suporte**, para que essa pessoa consiga
 * provisionar os demais clientes pela interface. Daí em diante nada mais
 * precisa passar por linha de comando.
 *
 * Roda uma vez. Se já houver usuário no banco, ele se recusa: o caminho normal
 * a partir daí é a tela de provisionamento.
 *
 *   npm run bootstrap -- \
 *     --orgao "PREFEITURA MUNICIPAL DE ADAMANTINA" \
 *     --cnpj 12345678000199 --municipio 1 --entidade 1 \
 *     --nome "Fulano de Tal" --cpf 12345678909 \
 *     --email fulano@empresa.com --senha "SenhaForte1!" \
 *     [--tipo PREFEITURA_MUNICIPAL] [--periodicidade QUADRIMESTRAL]
 */
import { PrismaClient } from '@prisma/client';
import { PrismaSuporteRepository } from '../../src/infrastructure/database/PrismaSuporteRepository';
import { hashSenha } from '../../src/shared/auth/senha';

const prisma = new PrismaClient();

/** `--chave valor` → `{ chave: valor }`. */
function argumentos(): Record<string, string> {
  const out: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] ?? '';
  }
  return out;
}

const OBRIGATORIOS = ['orgao', 'cnpj', 'municipio', 'entidade', 'nome', 'cpf', 'email', 'senha'];

async function main(): Promise<void> {
  const jaExiste = await prisma.usuario.count();
  if (jaExiste > 0) {
    throw new Error(
      `Já existem ${jaExiste} usuário(s) neste banco. O bootstrap é só para banco vazio — ` +
        'para criar outro órgão, use a tela de provisionamento.',
    );
  }

  const a = argumentos();
  const faltando = OBRIGATORIOS.filter((k) => !a[k]?.trim());
  if (faltando.length) {
    throw new Error(`Faltam argumentos: ${faltando.map((k) => `--${k}`).join(', ')}`);
  }

  const repo = new PrismaSuporteRepository();
  const cnpj = a.cnpj.replace(/\D/g, '');
  const cpf = a.cpf.replace(/\D/g, '');

  if (cnpj.length !== 14) throw new Error('CNPJ deve ter 14 dígitos.');
  if (cpf.length !== 11) throw new Error('CPF deve ter 11 dígitos.');
  if (a.senha.length < 8) throw new Error('A senha precisa de ao menos 8 caracteres.');

  const r = await repo.provisionar({
    orgao: {
      nome: a.orgao.trim(),
      cnpj,
      codigoMunicipio: Number(a.municipio),
      codigoEntidade: Number(a.entidade),
      tipoOrgao: a.tipo?.trim() || 'PREFEITURA_MUNICIPAL',
      periodicidade: a.periodicidade?.trim() || 'QUADRIMESTRAL',
    },
    admin: {
      nome: a.nome.trim(),
      email: a.email.trim().toLowerCase(),
      documento: cpf,
      senhaHash: await hashSenha(a.senha),
      // Com a marca de suporte: é esta pessoa que vai provisionar os demais
      // clientes pela interface, sem precisar de linha de comando outra vez.
      suporte: true,
    },
  });

  console.log(`\nPronto.\n`);
  console.log(`  Órgão .......... ${r.clienteNome}`);
  console.log(`  Grupo .......... Administrador`);
  console.log(`  Usuário ........ ${a.email.trim().toLowerCase()} (com marca de suporte)`);
  console.log(`\nEntre no sistema com esse e-mail e a senha informada.`);
  console.log(`O endereço e o celular do cadastro ficam em branco — complete no primeiro acesso.\n`);
}

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
