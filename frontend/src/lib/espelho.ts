/**
 * Apoio ao Espelho da Prestação de Contas.
 *
 * O documento vem do montador com as chaves do TCESP (`relacao_empregados`,
 * `salario_contratual`). Aqui elas viram rótulos legíveis — e o que **não**
 * estiver mapeado continua aparecendo, com o nome humanizado: bloco novo no
 * montador entra no espelho sozinho, em vez de sumir sem ninguém notar.
 */

export const BLOCO_LABEL: Record<string, string> = {
  descritor: 'Descritor do documento',
  codigo_ajuste: 'Código do ajuste',
  retificacao: 'Retificação',
  relacao_empregados: 'Relação de empregados',
  relacao_bens: 'Relação de bens',
  documentos_fiscais: 'Documentos fiscais',
  pagamentos: 'Pagamentos',
  receitas: 'Receitas',
  disponibilidades: 'Disponibilidades',
  descontos: 'Descontos',
  devolucoes: 'Devoluções',
  glosas: 'Glosas',
  empenhos: 'Empenhos',
  repasses: 'Repasses',
  servidores_cedidos: 'Servidores cedidos',
  contratos: 'Contratos',
  relatorio_atividades: 'Relatório de atividades',
  dados_gerais_entidade_beneficiaria: 'Dados gerais da entidade beneficiária',
  responsaveis_membros_orgao_concessor: 'Responsáveis do órgão concessor',
  declaracoes: 'Declarações',
  parecer_conclusivo: 'Parecer conclusivo',
  transparencia: 'Transparência',
  demonstracoes_contabeis: 'Demonstrações contábeis',
  publicacoes_parecer_ata: 'Publicações de parecer e ata',
  publicacao_relatorio_atividades: 'Publicação do relatório de atividades',
  prestacao_contas_entidade_beneficiaria: 'Prestação de contas da entidade',
  publicacao_regulamento_compras: 'Publicação do regulamento de compras',
  publicacao_extrato_execucao_fisica_financeira: 'Publicação do extrato físico-financeiro',
  termo_cessao_permissao_bens: 'Termo de cessão / permissão de bens',
  ajustes_saldo: 'Ajustes de saldo',
};

/** `salario_contratual` → `Salário contratual`, quando não há rótulo próprio. */
export function humanizar(chave: string): string {
  const texto = chave.replace(/_/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Campos monetários — reconhecidos pelo nome, que segue o padrão do TCESP. */
const EH_DINHEIRO = /valor|salario|remuneracao|saldo|montante|total/i;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Um valor do documento em texto de leitura. */
export function formatar(chave: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'number') return EH_DINHEIRO.test(chave) ? moeda.format(valor) : String(valor);
  if (typeof valor === 'string')
    return DATA_ISO.test(valor) ? valor.split('-').reverse().join('/') : valor;
  // Objeto ou lista aninhada: o espelho mostra a contagem e a tela abre o
  // detalhe — despejar JSON cru numa célula não ajudaria quem revisa.
  if (Array.isArray(valor)) return `${valor.length} item(ns)`;
  return '(detalhe)';
}

/** Soma dos campos monetários de uma lista — o total que se confere primeiro. */
export function totalMonetario(linhas: Record<string, unknown>[]): { campo: string; total: number } | null {
  const primeira = linhas[0];
  if (!primeira) return null;

  const campo = Object.keys(primeira).find(
    (k) => EH_DINHEIRO.test(k) && typeof primeira[k] === 'number',
  );
  if (!campo) return null;

  return {
    campo,
    total: linhas.reduce((s, l) => s + (typeof l[campo] === 'number' ? (l[campo] as number) : 0), 0),
  };
}

export const formatarMoedaEspelho = (v: number) => moeda.format(v);
