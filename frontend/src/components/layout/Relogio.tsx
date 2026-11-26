import { useEffect, useState } from 'react';

/**
 * Relógio digital da barra superior, ao lado do clima.
 *
 * A hora é a do computador de quem está usando, a mesma do relógio do Windows.
 * O sistema não tem um "fuso do órgão", e todos os clientes estão em SP.
 *
 * O ciclo se alinha à virada do segundo (`1000 - ms`). Com um `setInterval`
 * de 1 s solto, o ponteiro poderia ficar até um segundo atrasado em relação
 * ao relógio do sistema e "pular" números de vez em quando.
 */
export function Relogio() {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    let timer: number;
    const tique = () => {
      const d = new Date();
      setAgora(d);
      timer = window.setTimeout(tique, 1000 - d.getMilliseconds());
    };
    timer = window.setTimeout(tique, 1000 - new Date().getMilliseconds());
    return () => window.clearTimeout(timer);
  }, []);

  const hora = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  // "Quinta-feira, 26 de Novembro de 2026". O pt-BR escreve dia da semana e
  // mês em minúscula; aqui os dois vão com inicial maiúscula, como pedido.
  const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const data = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
    .formatToParts(agora)
    .map((p) => (p.type === 'weekday' || p.type === 'month' ? maiuscula(p.value) : p.value))
    .join('');

  return (
    // Some abaixo de `md`, como o clima: no celular o espaço é da busca, do
    // sino e do perfil, e o relógio do próprio aparelho já está à vista.
    <span
      title={data}
      className="hidden items-start rounded-xl px-2 py-1 text-ink-500 dark:text-ink-400 md:inline-flex"
    >
      {/* Hora em cima, maior e em negrito; data embaixo, menor e mais clara.
          As duas alinhadas à esquerda. `leading-tight` mantém as duas linhas na altura da barra. */}
      <span className="flex flex-col items-start leading-tight">
        <time dateTime={agora.toISOString()} className="text-[11.5px] font-semibold tabular-nums">
          {hora}
        </time>
        {/* A data só a partir de `lg`, como o nome da cidade no clima: em telas
            médias a barra já está cheia, e a hora é o que mais importa. */}
        <span className="hidden whitespace-nowrap text-[9.5px] text-ink-400 lg:inline">
          {data}
        </span>
      </span>
    </span>
  );
}
