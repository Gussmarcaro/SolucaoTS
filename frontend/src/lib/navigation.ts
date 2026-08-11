import {
  LayoutDashboard,
  FolderPlus,
  PlayCircle,
  Wallet,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Eye,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavNode {
  label: string;
  icon?: LucideIcon;
  /** Rota (apenas para folhas). Grupos não têm rota. */
  to?: string;
  children?: NavNode[];
  badge?: string;
  /**
   * Grupos que enxergam o item. Ausente = visível para todos.
   * Isto é conveniência de interface — quem barra o acesso é o backend.
   */
  grupos?: string[];
}

/** Grupos com acesso às telas administrativas. */
export const GRUPOS_ADMIN = ['Administrador', 'Suporte'];

/** Compara nomes de grupo ignorando acento e caixa. */
const normalizar = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export function podeVer(node: NavNode, grupo: string | null): boolean {
  if (!node.grupos) return true;
  return !!grupo && node.grupos.some((g) => normalizar(g) === normalizar(grupo));
}

/** Remove os itens que o grupo não enxerga, e os ramos que ficaram vazios. */
export function filtrarPorGrupo(nodes: NavNode[], grupo: string | null): NavNode[] {
  return nodes
    .filter((n) => podeVer(n, grupo))
    .map((n) => (n.children ? { ...n, children: filtrarPorGrupo(n.children, grupo) } : n))
    .filter((n) => !n.children || n.children.length > 0);
}

export const navigation: NavNode[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    label: 'Cadastro',
    icon: FolderPlus,
    children: [
      { label: 'Entidades / Beneficiárias', to: '/cadastro/entidades' },
      { label: 'Ajustes Celebrados', to: '/cadastro/ajustes' },
      { label: 'Fornecedores / Prestadores', to: '/cadastro/fornecedores' },
      { label: 'Contratos Firmados', to: '/cadastro/contratos' },
      { label: 'Colaboradores', to: '/cadastro/colaboradores' },
      { label: 'Bens Cedidos', to: '/cadastro/bens-cedidos' },
      { label: 'Servidores Cedidos', to: '/cadastro/servidores-cedidos' },
    ],
  },
  {
    label: 'Execução',
    icon: PlayCircle,
    children: [
      {
        label: 'Financeiro',
        icon: Wallet,
        children: [
          { label: 'Contas Bancárias', to: '/execucao/financeiro/contas-bancarias' },
          { label: 'Receitas', to: '/execucao/financeiro/receitas' },
          { label: 'Despesas', to: '/execucao/financeiro/despesas' },
          { label: 'Pagamentos', to: '/execucao/financeiro/pagamentos' },
          { label: 'Rateio Administrativo – Custos Indiretos', to: '/execucao/financeiro/rateio' },
          { label: 'Conciliação Bancária', to: '/execucao/financeiro/conciliacao' },
        ],
      },
      { label: 'Técnico', to: '/execucao/tecnico' },
    ],
  },
  { label: 'Prestação de Contas', icon: ClipboardCheck, to: '/prestacao-contas' },
  { label: 'Relatórios', icon: BarChart3, to: '/relatorios' },
  { label: 'Fiscalização | Monitoramento', icon: ShieldCheck, to: '/fiscalizacao' },
  { label: 'Transparência', icon: Eye, to: '/transparencia' },
  {
    label: 'Configurações',
    icon: Settings,
    children: [
      // 'Empresas' fora do menu por ora — cadastro sem uso no fluxo atual.
      // A rota /empresas segue registrada em App.tsx.
      { label: 'Órgãos', to: '/orgaos' },
      { label: 'Usuários', to: '/usuarios' },
      { label: 'Grupos de Usuários', to: '/grupos' },
      { label: 'Auditoria', to: '/auditoria', grupos: GRUPOS_ADMIN },
    ],
  },
];
