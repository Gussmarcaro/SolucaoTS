import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Abre o formulário de "novo" quando a tela chega com `?novo=1` no endereço.
 *
 * É o que faz um atalho valer a pena: "Lançar despesa" que só leva à lista
 * economiza um clique de menu e deixa o principal por fazer. Com o parâmetro,
 * o atalho cai direto no formulário aberto.
 *
 * Três cuidados:
 *
 * - **Abre uma vez só, e limpa o parâmetro** (`replace`, sem entrada nova no
 *   histórico). Sem isso, salvar e recarregar a página reabriria o formulário,
 *   e o botão Voltar voltaria para um formulário que a pessoa já fechou.
 * - **Só com permissão de gravar** (`habilitado`). O atalho já some para quem
 *   não pode criar, mas o endereço pode chegar por outro caminho — um link
 *   colado —, e abrir um formulário que o servidor vai recusar é pior que
 *   abrir a lista.
 * - **Espera a tela estar pronta.** Nas telas de Execução o portão do ajuste
 *   monta a página só depois da escolha; o parâmetro sobrevive à escolha, e o
 *   formulário abre já dentro do ajuste certo.
 */
export function useAbrirNovoPelaUrl(abrir: () => void, habilitado: boolean) {
  const [params, setParams] = useSearchParams();
  const jaAbriu = useRef(false);
  const pedido = params.get('novo') === '1';

  useEffect(() => {
    // Rearma quando o parâmetro sai do endereço. Sem isso, pedir "Lançar
    // despesa" pelo Ctrl+K estando já na tela de Despesas não abriria nada:
    // a tela não é remontada, e a guarda continuaria marcada da vez anterior.
    if (!pedido) {
      jaAbriu.current = false;
      return;
    }
    if (jaAbriu.current) return;
    jaAbriu.current = true;
    if (habilitado) abrir();
    const resto = new URLSearchParams(params);
    resto.delete('novo');
    setParams(resto, { replace: true });
    // `abrir` muda a cada render nas telas que o passam inline; a guarda
    // `jaAbriu` é o que garante a abertura única, não a lista de dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido, habilitado]);
}
