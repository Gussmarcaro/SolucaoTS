import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * O pedaço da tela que não chegou.
 *
 * Existe por causa da divisão por rota. Antes, o sistema inteiro vinha num
 * arquivo só: quem tinha a aba aberta continuava navegando mesmo depois de uma
 * publicação, porque nada mais era buscado. Agora cada tela chega quando se
 * entra nela — e uma tela que o usuário ainda não abriu, publicada por cima,
 * responde 404 e o React derruba a árvore. Tela branca, sem mensagem.
 *
 * É a troca honesta da divisão: a primeira carga ficou em menos da metade, e
 * em troca a aba antiga passou a depender de um arquivo que pode ter sido
 * substituído. Este limite converte esse caso no que o usuário faria de
 * qualquer jeito — recarregar —, só que sozinho e uma vez.
 *
 * **Recarrega uma vez só.** A marca fica no `sessionStorage`, e não no estado
 * do componente: o recarregamento apaga o estado, e sem a marca um erro que
 * persista viraria um laço de recargas — bem pior que a tela branca que se
 * queria evitar. Na segunda vez, mostra a mensagem e deixa a decisão com quem
 * está na frente da tela.
 */
const MARCA = 'recarga-por-pedaco-ausente';

/** O erro de pedaço ausente não tem tipo próprio; reconhece-se pela mensagem. */
function ehPedacoAusente(erro: Error): boolean {
  const t = `${erro.name} ${erro.message}`;
  return (
    /ChunkLoadError/i.test(t) ||
    /dynamically imported module/i.test(t) ||
    /Importing a module script failed/i.test(t) ||
    /Failed to fetch/i.test(t)
  );
}

interface Props {
  children: ReactNode;
}

interface Estado {
  falhou: boolean;
}

export class LimiteDeCarga extends Component<Props, Estado> {
  state: Estado = { falhou: false };

  static getDerivedStateFromError(): Estado {
    return { falhou: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    if (!ehPedacoAusente(erro)) {
      // Não é problema de carga — é erro de verdade na tela. Deixa subir para
      // o console: engolir aqui esconderia o defeito atrás de um "recarregue".
      console.error('Erro ao renderizar a tela:', erro, info.componentStack);
      return;
    }

    let jaTentou = false;
    try {
      jaTentou = sessionStorage.getItem(MARCA) === '1';
      if (!jaTentou) sessionStorage.setItem(MARCA, '1');
    } catch {
      // Aba anônima ou armazenamento bloqueado: sem marca não há como saber se
      // já tentamos, e recarregar às cegas arrisca o laço. Fica a mensagem.
      return;
    }
    if (!jaTentou) window.location.reload();
  }

  /**
   * Limpa a marca assim que uma tela renderiza.
   *
   * Sem isto, a marca sobreviveria à sessão inteira e a próxima publicação
   * cairia direto na mensagem, sem a recarga automática que resolve o caso.
   */
  componentDidMount(): void {
    try {
      sessionStorage.removeItem(MARCA);
    } catch {
      /* sem armazenamento: nada a limpar */
    }
  }

  render(): ReactNode {
    if (!this.state.falhou) return this.props.children;
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Não foi possível carregar esta tela. O sistema pode ter sido atualizado enquanto esta
          aba estava aberta.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
