import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Building2,
  CalendarClock,
  BarChart3,
  Settings,
  Users,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    title: 'Principal',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Audesp Fase V',
    items: [
      { label: 'Ajustes', to: '/ajustes', icon: FileText },
      { label: 'Prestação de Contas', to: '/prestacao-contas', icon: ClipboardCheck, badge: '3' },
      { label: 'Entidades', to: '/entidades', icon: Building2 },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { label: 'Tarefas & Prazos', to: '/tarefas', icon: CalendarClock, badge: '5' },
      { label: 'Relatórios', to: '/relatorios', icon: BarChart3 },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Empresas', to: '/empresas', icon: Landmark },
      { label: 'Usuários', to: '/usuarios', icon: Users },
      { label: 'Configurações', to: '/configuracoes', icon: Settings },
    ],
  },
];
