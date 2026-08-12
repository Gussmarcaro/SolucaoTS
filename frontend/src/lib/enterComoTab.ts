import type { KeyboardEvent } from 'react';

/**
 * Ordem de tabulação dentro do formulário. Espelha o que o navegador considera
 * focável, exceto o que está desabilitado ou fora da ordem (`tabindex="-1"`).
 */
const FOCAVEIS =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Faz o Enter andar para o próximo campo, como o Tab.
 *
 * Nos cadastros o Enter disparava o *submit implícito* do formulário: quem
 * apertava Enter para "confirmar" o campo acabava salvando o registro pela
 * metade. Aqui o Enter é interceptado e vira navegação.
 *
 * Fica de fora, de propósito:
 * - **textarea**, que precisa do Enter para quebrar linha;
 * - **botões**, que precisam do Enter para serem acionados — inclusive o de
 *   salvar, então ainda dá para submeter pelo teclado, chegando nele por Tab;
 * - eventos já tratados por um componente (`defaultPrevented`), como a seleção
 *   de um item numa lista de autocomplete.
 */
export function enterComoTab(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== 'Enter' || e.defaultPrevented || e.shiftKey || e.ctrlKey || e.altKey) return;

  const alvo = e.target as HTMLElement;
  if (alvo instanceof HTMLTextAreaElement || alvo.isContentEditable) return;
  if (alvo instanceof HTMLButtonElement) return;
  if (alvo instanceof HTMLInputElement && (alvo.type === 'submit' || alvo.type === 'button')) return;

  const focaveis = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
    (el) =>
      el.tabIndex !== -1 &&
      // `offsetParent` nulo = elemento oculto; não faria parte da ordem do Tab.
      el.offsetParent !== null &&
      // As opções de um autocomplete aberto são botões, mas não são "o próximo
      // campo": o Enter cairia dentro da lista em vez de seguir o formulário.
      !el.closest('[role="listbox"]'),
  );
  const atual = focaveis.indexOf(alvo);
  if (atual === -1) return;

  // Segura o submit implícito mesmo quando não há próximo campo — é justamente
  // o Enter no último campo que salvava sem querer.
  e.preventDefault();
  focaveis[atual + 1]?.focus();
}
