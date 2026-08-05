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
      { label: 'Empresas', to: '/empresas' },
      { label: 'Usuários', to: '/usuarios' },
    ],
  },
];
