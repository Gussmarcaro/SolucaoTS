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

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);
