import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, Bell, Info, LogOut, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/cn';
import { http } from '@/services/http';
import { Alertas } from './Alertas';
import { Assistente } from './Assistente';
import { BuscaGlobal } from './BuscaGlobal';
import { SeletorOrgao } from './SeletorOrgao';
import { SobreModal } from './SobreModal';

interface TopbarProps {
  onOpenSidebar: () => void;
  /**
   * Menu recolhido. Quando está, a logo sai do menu e vem para cá — no trilho
   * de 76px não cabe, e a marca sumir de vez deixa a tela sem identidade.
   */
  collapsed?: boolean;
}

function iniciais(nome?: string): string {
  if (!nome) return 'US';
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase();
}

export function Topbar({ onOpenSidebar, collapsed = false }: TopbarProps) {
  const { usuario, sair } = useAuth();
  const [sobreAberto, setSobreAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [alertasAbertos, setAlertasAbertos] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [temVencido, setTemVencido] = useState(false);
  const sino = useRef<HTMLDivElement>(null);

  // Fecha o painel ao clicar fora ou apertar Esc.
  //
  // O teste é "está dentro do bloco do sino?", que abrange o botão e o painel.
  // Fosse só o painel, o clique no próprio sino fecharia aqui e o `onClick` do
  // botão reabriria em seguida — ele nunca conseguiria fechar.
  useEffect(() => {
    if (!alertasAbertos) return;
    const foraOuEsc = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setAlertasAbertos(false);
        return;
      }
      if (!sino.current?.contains(e.target as Node)) setAlertasAbertos(false);
    };
    document.addEventListener('mousedown', foraOuEsc);
    document.addEventListener('keydown', foraOuEsc);
    return () => {
      document.removeEventListener('mousedown', foraOuEsc);
      document.removeEventListener('keydown', foraOuEsc);
    };
  }, [alertasAbertos]);

  // Contagem para o distintivo do sino. Falha aqui não mostra erro: um número
  // ausente é melhor que um aviso de erro para algo que ninguém pediu.
  useEffect(() => {
    http
      .get<{ urgencia: string }[]>('/alertas')
      .then((r) => {
        setPendentes(r.data.length);
        setTemVencido(r.data.some((a) => a.urgencia === 'VENCIDO'));
      })
      .catch(() => setPendentes(0));
  }, []);
  // O botão só aparece onde o assistente está configurado — um ícone que abre
  // um painel com erro é pior que ícone nenhum.
  const [temAssistente, setTemAssistente] = useState(false);

  useEffect(() => {
    http
      .get<{ disponivel: boolean }>('/assistente/status')
      .then((r) => setTemAssistente(r.data.disponivel))
      .catch(() => setTemAssistente(false));
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md dark:border-ink-800/70 dark:bg-ink-950/70 sm:px-6">
      <button
        onClick={onOpenSidebar}
        className="focus-ring rounded-xl p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/*
       * A logo, só com o menu recolhido — quando ele está aberto ela já aparece
       * no cabeçalho dele, e mostrar as duas seria a mesma marca duas vezes na
       * mesma linha do olho.
       *
       * Só no desktop (`lg`): abaixo disso o menu é uma gaveta sobreposta, que
       * leva a logo junto e não deixa trilho nenhum na tela.
       *
       * É a arte **deitada**, a mesma do menu, e entra do mesmo jeito: o par de
       * imagens trocado por tema, sem placa nem fundo. O que muda é o arquivo —
       * `logo-menu` tem o texto branco, feito para o azul da barra lateral, e
       * sobre o branco daqui sobraria só o ícone. `logo-deitada` é a mesma arte
       * com a palette de fundo claro/escuro (ver `public/LOGOS.md`).
       *
       * `h-11` aqui é **maior** que o `h-12` de antes: a arte foi aparada na
       * caixa útil, então a altura pedida virou a altura que se vê, sem folga
       * transparente por dentro.
       *
       * Duas imagens em vez de uma porque `display:none` tira a que não vale da
       * árvore de acessibilidade — o leitor de tela anuncia a marca uma vez só.
       */}
      {collapsed && (
        <div className="hidden animate-fade-in items-center lg:flex">
          <img
            src="/logo-deitada.png"
            alt="Solução TS"
            className="h-11 w-auto object-contain dark:hidden"
          />
          <img
            src="/logo-deitada-dark.png"
            alt="Solução TS"
            className="hidden h-11 w-auto object-contain dark:block"
          />
        </div>
      )}

      {/* Busca — nasce fechada e abre pelo botão da lupa. `ml-auto` empurra a
          busca e tudo que vem depois dela (ações e perfil) para a direita. */}
      <BuscaGlobal aberta={buscaAberta} onFechar={() => setBuscaAberta(false)} />

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:flex-none">
        {/* Órgão em atendimento — só aparece para a equipe do fornecedor, e
            fica antes das ações porque é o contexto de tudo o que vem depois. */}
        <SeletorOrgao />

        {/* `preventDefault` no mouse down: sem ele, o clique tiraria o foco do
            campo, o `onBlur` fecharia a busca e o clique em seguida a abriria
            de novo — o botão nunca conseguiria fechar. */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setBuscaAberta((v) => !v)}
          aria-label="Buscar"
          aria-expanded={buscaAberta}
          title="Buscar"
          className={cn(
            'focus-ring hidden h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-800 dark:hover:text-ink-100 sm:inline-flex',
            buscaAberta
              ? 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'
              : 'text-ink-500 dark:text-ink-400',
          )}
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        {temAssistente && (
          <button
            onClick={() => setAssistenteAberto((v) => !v)}
            aria-label="Assistente da Fase V"
            aria-expanded={assistenteAberto}
            title="Assistente da Fase V"
            className={cn(
              'focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-800 dark:hover:text-ink-100',
              assistenteAberto
                ? 'bg-ink-100 text-brand-600 dark:bg-ink-800 dark:text-brand-400'
                : 'text-ink-500 dark:text-ink-400',
            )}
          >
            <Sparkles className="h-[18px] w-[18px]" />
          </button>
        )}

        <ThemeToggle />

        <div className="relative" ref={sino}>
          <button
            onClick={() => setAlertasAbertos((v) => !v)}
            aria-label={
              pendentes > 0 ? `Prazos e pendências (${pendentes})` : 'Prazos e pendências'
            }
            aria-expanded={alertasAbertos}
            title="Prazos e pendências"
            className={cn(
              'focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-800 dark:hover:text-ink-100',
              alertasAbertos
                ? 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'
                : 'text-ink-500 dark:text-ink-400',
            )}
          >
            <Bell className="h-[18px] w-[18px]" />
            {/* O contador só aparece quando há prazo de verdade. O ponto fixo
                que existia aqui antes sinalizava novidade o tempo todo, o que
                é o mesmo que não sinalizar nada. */}
            {pendentes > 0 && (
              <span
                className={cn(
                  'absolute -right-0.5 -top-0.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-[1.15rem] text-white ring-2 ring-white dark:ring-ink-950',
                  temVencido ? 'bg-red-500' : 'bg-amber-500',
                )}
              >
                {pendentes > 9 ? '9+' : pendentes}
              </span>
            )}
          </button>

          <Alertas aberto={alertasAbertos} onFechar={() => setAlertasAbertos(false)} />
        </div>

        <button
          onClick={() => setSobreAberto(true)}
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          aria-label="Sobre o sistema"
          title="Sobre o sistema"
        >
          <Info className="h-[18px] w-[18px]" />
        </button>

        <div className="mx-1 hidden h-6 w-px bg-ink-200 dark:bg-ink-800 sm:block" />

        {/*
         * Perfil — é o atalho para "Meu Perfil".
         *
         * O nome na barra é onde se procura o próprio cadastro, e por isso a
         * tela não precisa de item de menu. Vai como link, não como botão com
         * `navigate`: abre em outra aba, mostra o destino na barra de status e
         * responde ao teclado sem nada a mais.
         */}
        <Link
          to="/perfil"
          title="Meu perfil"
          aria-label="Meu perfil"
          className="focus-ring flex items-center gap-2 rounded-xl py-1 pl-1 pr-1 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800 sm:pr-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
            {iniciais(usuario?.nome)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[160px] truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
              {usuario?.nome ?? 'Usuário'}
            </span>
            <span className="block max-w-[160px] truncate text-[11px] text-ink-400">
              {usuario?.email ?? ''}
            </span>
          </span>
        </Link>

        <button
          onClick={sair}
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-ink-400 dark:hover:bg-red-500/10"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>

      <Assistente aberto={assistenteAberto} onFechar={() => setAssistenteAberto(false)} />
      <SobreModal open={sobreAberto} onClose={() => setSobreAberto(false)} />
    </header>
  );
}
