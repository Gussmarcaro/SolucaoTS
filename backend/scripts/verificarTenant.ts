/**
 * Confere o isolamento multi-tenant. Não precisa de banco.
 *
 * É a verificação mais delicada do conjunto, porque a falha é invisível dos
 * dois lados: filtro a menos e um órgão lê os dados de outro sem que nada
 * quebre; filtro a mais e a tela fica vazia sem dizer por quê. Aqui a regra é
 * exercitada como função pura, argumento a argumento.
 *
 *   npm run verificar:tenant
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import {
  aplicarTenant,
  ehRaizDeTenant,
  type ArgsPrisma,
} from '../src/infrastructure/database/extensaoTenant';
import { MODELS_COM_CLIENTE } from '../src/infrastructure/database/extensaoAuditoria';

const falhas: string[] = [];

function conferir(descricao: string, ok: boolean, detalhe = ''): void {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
}

const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; // órgão da requisição
const OUTRO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const json = (v: unknown) => JSON.stringify(v);

console.log('\nIsolamento multi-tenant\n');

// --- o catálogo de raízes --------------------------------------------------
{
  const doSchema = Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'clienteId'))
    .map((m) => m.name);

  conferir(
    'as raízes saem do schema, não de lista escrita à mão',
    doSchema.length === MODELS_COM_CLIENTE.size && doSchema.every((m) => MODELS_COM_CLIENTE.has(m)),
    `${MODELS_COM_CLIENTE.size} raízes`,
  );

  // Os cadastros que vivem soltos são os que mais fácil escapam: não têm pai
  // de onde herdar o órgão, então sem a coluna ficariam visíveis a todos.
  for (const m of [
    'Usuario',
    'GrupoUsuario',
    'EntidadeBeneficiaria',
    'Ajuste',
    'Fornecedor',
    'Colaborador',
    'ContratoFirmado',
    'BemCedido',
    'ServidorCedidoCadastro',
    'Tarefa',
  ]) {
    conferir(`${m} é raiz de tenant`, ehRaizDeTenant(m));
  }
  conferir('Cliente entra pelo caminho próprio', ehRaizDeTenant('Cliente'));

  // Filho não é raiz: alcança o órgão pelo pai. Marcá-lo como raiz obrigaria a
  // uma coluna que a relação já dispensa — e a mantê-la sincronizada.
  for (const m of ['Pagamento', 'DocumentoFiscal', 'PrestacaoContas', 'TermoAditivo', 'Meta']) {
    conferir(`${m} não é raiz (herda pelo pai)`, !ehRaizDeTenant(m));
  }
  conferir('tabela de domínio não é raiz', !ehRaizDeTenant('Cbo'), 'catálogo oficial é comum a todos');
}

// --- chaves de duplicidade --------------------------------------------------
// Um `@unique` global num cadastro de órgão é bug dos dois lados: impede a
// Prefeitura B de cadastrar a mesma OSC que a A já cadastrou, e some com a
// trava assim que a coluna do órgão entra no jogo.
{
  const CHAVES: Record<string, string> = {
    Fornecedor: 'documento',
    Colaborador: 'cpf',
    BemCedido: 'identificador',
    ServidorCedidoCadastro: 'cpf',
    EntidadeBeneficiaria: 'cnpj',
    Empresa: 'cnpj',
    GrupoUsuario: 'nome',
    Ajuste: 'codigoAjuste',
  };

  for (const [model, campo] of Object.entries(CHAVES)) {
    const meta = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
    const composta = (meta?.uniqueFields ?? []).some(
      (campos) => campos.length === 2 && campos.includes('clienteId') && campos.includes(campo),
    );
    conferir(`${model}.${campo} é único por órgão`, composta);
  }

  // Enquanto o backfill não roda, o `@unique` global continua de pé — é ele que
  // segura a duplicidade, já que no Postgres NULL nunca conflita com NULL.
  // Quando estas duas linhas trocarem de sinal, o aperto foi aplicado.
  const globais = Object.entries(CHAVES).filter(([model, campo]) => {
    const meta = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
    return meta?.fields.some((f) => f.name === campo && f.isUnique);
  });
  console.log(
    `  --   ${globais.length} chave(s) ainda únicas no sistema inteiro: ${
      globais.map(([m]) => m).join(', ') || '(nenhuma)'
    }`,
  );
  console.log('       elas saem no aperto do schema, depois do backfill.');
}

// --- sem órgão no contexto -------------------------------------------------
{
  const args: ArgsPrisma = { where: { ativo: true } };
  conferir(
    'sem órgão no contexto, nada é filtrado',
    aplicarTenant('Fornecedor', 'findMany', args, null) === args,
    'seeds, scripts e startup precisam enxergar tudo',
  );
}

// --- listagens -------------------------------------------------------------
{
  const r = aplicarTenant('Fornecedor', 'findMany', { where: { ativo: true } }, T);
  conferir(
    'findMany recebe o filtro do órgão',
    json(r?.where) === json({ AND: [{ ativo: true }, { clienteId: T }] }),
    json(r?.where),
  );

  const semWhere = aplicarTenant('Colaborador', 'findMany', {}, T);
  conferir('findMany sem where ganha o filtro sozinho', json(semWhere?.where) === json({ clienteId: T }));

  const contagem = aplicarTenant('Ajuste', 'count', { where: { status: 'ENVIADO' } }, T);
  conferir(
    'count também é filtrado',
    json(contagem?.where) === json({ AND: [{ status: 'ENVIADO' }, { clienteId: T }] }),
    'senão o total do dashboard contaria os outros órgãos',
  );

  // A trava que importa: o chamador não consegue passar por cima do tenant.
  const tentativa = aplicarTenant('Fornecedor', 'findMany', { where: { clienteId: OUTRO } }, T);
  conferir(
    'filtro do chamador não sobrescreve o do órgão',
    json(tentativa?.where) === json({ AND: [{ clienteId: OUTRO }, { clienteId: T }] }),
    'o AND torna a consulta vazia em vez de vazar',
  );
}

// --- busca e escrita por chave única ---------------------------------------
{
  const r = aplicarTenant('Fornecedor', 'findUnique', { where: { id: 'x1' } }, T);
  conferir(
    'findUnique mantém a chave no topo e soma o órgão',
    json(r?.where) === json({ id: 'x1', clienteId: T }),
    'o Prisma exige ao menos um campo único no topo',
  );

  const upd = aplicarTenant('Colaborador', 'update', { where: { id: 'x1' }, data: { nome: 'A' } }, T);
  conferir('update de outro órgão vira "não encontrado"', json(upd?.where) === json({ id: 'x1', clienteId: T }));

  const del = aplicarTenant('BemCedido', 'delete', { where: { id: 'x1' } }, T);
  conferir('delete é filtrado igual', json(del?.where) === json({ id: 'x1', clienteId: T }));

  const ups = aplicarTenant(
    'Tarefa',
    'upsert',
    { where: { id: 'x1' }, create: { titulo: 'T' }, update: {} },
    T,
  );
  conferir(
    'upsert carimba o órgão no registro que cria',
    json(ups?.create) === json({ titulo: 'T', clienteId: T }),
    'senão o registro nascido de um upsert ficaria órfão',
  );
}

// --- exclusão e alteração em lote ------------------------------------------
{
  // A reimportação de CSV apaga e recria em lote: um deleteMany sem recorte
  // apagaria os itens do órgão vizinho.
  const r = aplicarTenant('Tarefa', 'deleteMany', { where: { status: 'CANCELADA' } }, T);
  conferir(
    'deleteMany é filtrado',
    json(r?.where) === json({ AND: [{ status: 'CANCELADA' }, { clienteId: T }] }),
    'operação em lote sem recorte é o pior caso',
  );

  const upd = aplicarTenant('Fornecedor', 'updateMany', { where: {}, data: { ativo: false } }, T);
  conferir('updateMany é filtrado', json(upd?.where) === json({ AND: [{}, { clienteId: T }] }));
}

// --- o próprio órgão -------------------------------------------------------
{
  const r = aplicarTenant('Cliente', 'findMany', {}, T);
  conferir(
    'Cliente é recortado pelo id, não por clienteId',
    json(r?.where) === json({ id: T }),
    'o órgão não tem coluna apontando para si mesmo',
  );
}

// --- o que não deve ser tocado ---------------------------------------------
{
  const filho: ArgsPrisma = { where: { prestacaoId: 'p1' } };
  conferir(
    'consulta a bloco da prestação passa intacta',
    aplicarTenant('Pagamento', 'findMany', filho, T) === filho,
    'chega pelo id da prestação, que já foi filtrada',
  );

  const criacao: ArgsPrisma = { data: { nome: 'X' } } as ArgsPrisma;
  conferir(
    'create passa intacto (o carimbo é da extension de auditoria)',
    aplicarTenant('Fornecedor', 'create', criacao, T) === criacao,
  );

  const dominio: ArgsPrisma = { where: { codigo: '1234' } };
  conferir('tabela de domínio passa intacta', aplicarTenant('Cbo', 'findMany', dominio, T) === dominio);
}

// --- a fronteira do suporte -------------------------------------------------
// `prismaGlobal` é o único caminho que fala com o banco sem recorte. Cada
// import dele fora do repositório de suporte é um furo — e um furo que nenhum
// teste de funcionalidade pegaria, porque tudo continua funcionando.
{
  const dir = 'src';
  const arquivos: string[] = [];
  const varrer = (p: string) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const caminho = join(p, e.name);
      if (e.isDirectory()) varrer(caminho);
      else if (e.name.endsWith('.ts')) arquivos.push(caminho);
    }
  };
  varrer(dir);

  const PERMITIDOS = [
    join('src', 'infrastructure', 'database', 'prisma.ts'), // onde é declarado
    join('src', 'infrastructure', 'database', 'PrismaSuporteRepository.ts'),
  ];

  const infratores = arquivos.filter(
    (f) => !PERMITIDOS.includes(f) && /\bprismaGlobal\b/.test(readFileSync(f, 'utf8')),
  );

  conferir(
    'só o repositório de suporte usa o client sem recorte',
    infratores.length === 0,
    infratores.length ? `usam prismaGlobal: ${infratores.join(', ')}` : 'prismaGlobal contido',
  );

  // A fronteira é um campo do usuário, não um nome de grupo. Grupo é cadastro
  // livre: bastaria criar um chamado "Suporte" para furar o isolamento inteiro.
  const usuario = Prisma.dmmf.datamodel.models.find((m) => m.name === 'Usuario');
  const campo = usuario?.fields.find((f) => f.name === 'suporte');
  conferir(
    'a marca de suporte é um campo booleano de Usuario',
    campo?.type === 'Boolean' && !campo.isList,
    'não é nome de grupo, que é cadastro livre',
  );
  conferir(
    'a marca nasce desligada',
    campo?.hasDefaultValue === true && campo?.default === false,
    'só se concede pelo comando suporte:conceder',
  );
}

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);
