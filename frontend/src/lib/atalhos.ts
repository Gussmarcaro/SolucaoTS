import {
  ArrowRightLeft,
  Banknote,
  CalendarPlus,
  ClipboardCheck,
  FolderPlus,
  HandCoins,
  Receipt,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { NivelPermissao } from '@/types/permissao';

/**
 * As ações mais comuns do dia a dia, num catálogo **único**.
 *
 * A faixa de atalhos do Dashboard e a paleta do Ctrl+K leem esta mesma lista.
 * Duas listas divergiriam na primeira tela nova: um atalho apontando para uma
 * rota que mudou, ou uma ação que aparece num lugar e não no outro.
 *
 * Cada ação declara a permissão que exige, e o **nível**: lançar exige
 * Edição; abrir para consultar exige só Consulta. O atalho some para quem não
 * tem — um botão que leva a "acesso negado" ensina a não confiar nos botões.
 */
export interface Atalho {
  id: string;
  rotulo: string;
  /** Uma linha, dita como o que acontece ao clicar. */
  descricao: string;
  icone: LucideIcon;
  /**
   * Para onde vai. `?novo=1` abre o formulário já aberto — ver
   * `useAbrirNovoPelaUrl`. Sem ele, a tela em si é a ação.
   */
  destino: string;
  recurso: string;
  nivel: NivelPermissao;
  /** Palavras que a paleta aceita além do rótulo ("nota", "nf", "boleto"…). */
  sinonimos: string[];
}

export const ATALHOS: Atalho[] = [
  {
    id: 'despesa',
    rotulo: 'Lançar despesa',
    descricao: 'Nova nota fiscal ou recibo',
    icone: Receipt,
    destino: '/execucao/financeiro/despesas?novo=1',
    recurso: 'EXECUCAO_DESPESAS',
    nivel: 'EDICAO',
    sinonimos: ['nota', 'nota fiscal', 'nf', 'recibo', 'documento fiscal', 'gasto'],
  },
  {
    id: 'pagamento',
    rotulo: 'Lançar pagamento',
    descricao: 'Pagamento de uma despesa',
    icone: Banknote,
    destino: '/execucao/financeiro/pagamentos?novo=1',
    recurso: 'EXECUCAO_PAGAMENTOS',
    nivel: 'EDICAO',
    sinonimos: ['pagar', 'boleto', 'pix', 'transferência', 'ted'],
  },
  {
    id: 'receita',
    rotulo: 'Registrar receita',
    descricao: 'Repasse ou outra entrada de recurso',
    icone: HandCoins,
    destino: '/execucao/financeiro/receitas?novo=1',
    recurso: 'EXECUCAO_RECEITAS',
    nivel: 'EDICAO',
    sinonimos: ['repasse', 'entrada', 'rendimento', 'crédito'],
  },
  {
    id: 'extrato',
    rotulo: 'Importar extrato',
    descricao: 'Arquivo OFX do banco, para conciliar',
    icone: ArrowRightLeft,
    // Sem `?novo=1`: o botão de importar já é o primeiro da tela, e a janela de
    // escolher arquivo o navegador só abre a partir de um clique real.
    destino: '/execucao/financeiro/conciliacao',
    recurso: 'EXECUCAO_CONCILIACAO',
    nivel: 'EDICAO',
    sinonimos: ['ofx', 'conciliação', 'conciliar', 'banco', 'extrato bancário'],
  },
  {
    id: 'meta',
    rotulo: 'Lançar meta realizada',
    descricao: 'O realizado de cada meta no período',
    icone: Target,
    destino: '/execucao/tecnico',
    recurso: 'EXECUCAO_TECNICO',
    nivel: 'EDICAO',
    sinonimos: ['meta', 'metas', 'execução técnica', 'realizado', 'atendimentos'],
  },
  {
    id: 'prestacao',
    rotulo: 'Prestação de contas',
    descricao: 'Abrir as prestações do exercício',
    icone: ClipboardCheck,
    // A lista, e não uma prestação: cada ajuste tem a sua, e escolher qual é
    // decisão da pessoa, não do atalho.
    destino: '/prestacao-contas',
    recurso: 'PRESTACAO_CONTAS',
    nivel: 'CONSULTA',
    sinonimos: ['prestação', 'audesp', 'transmitir', 'tcesp', 'espelho'],
  },
  {
    id: 'ajuste',
    rotulo: 'Novo ajuste',
    descricao: 'Convênio, termo ou contrato de gestão',
    icone: FolderPlus,
    destino: '/cadastro/ajustes?novo=1',
    recurso: 'CADASTRO_AJUSTES',
    nivel: 'EDICAO',
    sinonimos: ['convênio', 'termo de colaboração', 'termo de fomento', 'contrato de gestão', 'parceria'],
  },
  {
    id: 'compromisso',
    rotulo: 'Novo compromisso',
    descricao: 'Reunião, visita ou prazo na agenda',
    icone: CalendarPlus,
    destino: '/agenda?novo=1',
    recurso: 'AGENDA',
    nivel: 'EDICAO',
    sinonimos: ['agenda', 'reunião', 'visita', 'evento', 'agendar'],
  },
];

/** Sem acento e sem caixa — a mesma comparação para rótulo e sinônimos. */
export const normalizarBusca = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * As ações que casam com o que se digitou na paleta.
 *
 * Casa por **começo de palavra**, e não por trecho solto: "pag" acha "Lançar
 * pagamento" e "nota fis" acha "nota fiscal", mas "eta" não acha "meta". Com
 * trecho solto, quase toda sílaba casaria com alguma ação, e a lista viraria
 * ruído justamente quando a pessoa está digitando outra coisa.
 */
export function atalhosQueCasam(lista: Atalho[], termo: string): Atalho[] {
  const t = normalizarBusca(termo);
  if (!t) return lista;
  const casa = (texto: string) =>
    normalizarBusca(texto)
      .split(/[\s/]+/)
      // De cada palavra em diante, para "nota fis" casar com "nota fiscal".
      .some((_, i, palavras) => palavras.slice(i).join(' ').startsWith(t));

  /*
   * Quem casa pelo **nome** vem antes de quem casa pela descrição ou por
   * sinônimo. "desp" acha "Lançar despesa" e também "Lançar pagamento" (cuja
   * descrição é "Pagamento de uma despesa") — os dois servem, mas o Enter tem
   * de cair no que a pessoa quis dizer.
   */
  return lista
    .map((a, ordem) => ({ a, ordem, peso: casa(a.rotulo) ? 0 : 1 }))
    .filter(({ a }) => [a.rotulo, a.descricao, ...a.sinonimos].some(casa))
    .sort((x, y) => x.peso - y.peso || x.ordem - y.ordem)
    .map(({ a }) => a);
}
