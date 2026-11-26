import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

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
  const data = agora.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    // Some abaixo de `md`, como o clima: no celular o espaço é da busca, do
    // sino e do perfil, e o relógio do próprio aparelho já está à vista.
    <span
      title={data.charAt(0).toUpperCase() + data.slice(1)}
      className="hidden items-center gap-1.5 rounded-xl px-2 py-1 text-ink-500 dark:text-ink-400 md:inline-flex"
    >
      <Clock className="h-[18px] w-[18px]" />
      {/* A data só a partir de `lg`, como o nome da cidade no clima: em telas
          médias a barra já está cheia, e a hora é o que mais importa. */}
      <span className="hidden text-[13px] font-medium tabular-nums lg:inline">
        {agora.toLocaleDateString('pt-BR')}
      </span>
      <time
        dateTime={agora.toISOString()}
        className="font-mono text-[13px] font-medium tabular-nums"
      >
        {hora}
      </time>
    </span>
  );
}
