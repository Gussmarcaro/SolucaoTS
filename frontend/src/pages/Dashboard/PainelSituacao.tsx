import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, FileStack, Send } from 'lucide-react';
import { relatorioSituacao } from '@/services/relatorios.service';
import type { ResumoSituacao } from '@/pages/Relatorios/tipos';
import { BarraEmpilhada, type LinhaEmpilhada } from '@/components/graficos/BarraEmpilhada';
import { Figura, Legenda, type ItemLegenda } from '@/components/graficos/base';
import { STATUS_PRESTACAO_LABEL, type StatusPrestacao } from '@/types/prestacao';

/**
 * Cor de **estado**, não de série.
 *
 * É uma escala reservada: estes tons nunca viram "a série 4" em outro gráfico, e
 * por isso cada um pode significar sempre a mesma coisa em todo o sistema. Em
 * compensação, estado **nunca** anda sozinho na cor — vem com ícone e rótulo na
 * legenda. Na superfície clara o âmbar fica abaixo de 3:1 de contraste por
 * desenho; o par ícone + rótulo é a compensação, não um enfeite.
 *
 * `SUBSTITUIDO` e `EXCLUIDO` caem no cinza de segundo plano: são desfechos
 * administrativos, não estados que peçam ação hoje.
 */
const COR: Record<StatusPrestacao, string> = {
  EM_ELABORACAO: 'var(--g-rascunho)',
  ENVIADO: 'var(--g-enviado)',
  ARMAZENADO: 'var(--g-aceito)',
  REJEITADO: 'var(--g-rejeitado)',
  SUBSTITUIDO: 'var(--g-rascunho)',
  EXCLUIDO: 'var(--g-rascunho)',
};

const ICONE: Partial<Record<StatusPrestacao, React.ReactNode>> = {
  EM_ELABORACAO: <CircleDashed className="h-3 w-3 shrink-0 text-ink-400" />,
  ENVIADO: <Send className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-500" />,
  ARMAZENADO: <CheckCircle2 className="h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />,
  REJEITADO: <AlertTriangle className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />,
};

/** Ordem de empilhamento: o ciclo de vida da prestação, do rascunho ao desfecho. */
const ORDEM: StatusPrestacao[] = [
  'EM_ELABORACAO',
  'ENVIADO',
  'ARMAZENADO',
  'REJEITADO',
  'SUBSTITUIDO',
  'EXCLUIDO',
];

/**
 * Prestações por situação, por exercício.
 *
 * Aqui a barra conta **prestações**, não dinheiro — e por isso a escala
 * compartilhada entre os anos diz algo verdadeiro: um exercício com 20
 * prestações desenha uma barra duas vezes maior que um com 10.
 *
 * O número que fecha o painel não está no gráfico: são os ajustes que **nunca**
 * prestaram contas. Eles não têm barra porque não têm prestação nenhuma — e são
 * exatamente o caso que a tela precisa mostrar.
 */
export function PainelSituacao() {
  const [dados, setDados] = useState<ResumoSituacao | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    relatorioSituacao()
      .then((r) => vivo && setDados(r))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  if (falhou || !dados || dados.linhas.length === 0) return null;

  // Agrupa por exercício, do mais recente para o mais antigo.
  const anos = [...new Set(dados.linhas.map((l) => l.ano))].sort((a, b) => b - a);

  const presentes = ORDEM.filter((s) => dados.linhas.some((l) => l.status === s && l.quantidade > 0));

  const barras: LinhaEmpilhada[] = anos.map((ano) => {
    const doAno = dados.linhas.filter((l) => l.ano === ano);
    const total = doAno.reduce((s, l) => s + l.quantidade, 0);
    return {
      id: String(ano),
      rotulo: String(ano),
      anotacao: `${total} prestação(ões)`,
      segmentos: presentes.map((s) => ({
        rotulo: STATUS_PRESTACAO_LABEL[s],
        valor: doAno.find((l) => l.status === s)?.quantidade ?? 0,
        cor: COR[s],
      })),
    };
  });

  const legenda: ItemLegenda[] = presentes.map((s) => ({
    rotulo: STATUS_PRESTACAO_LABEL[s],
    cor: COR[s],
    icone: ICONE[s],
  }));

  const semPrestacao = dados.ajustesSemPrestacao.length;

  return (
    <Figura
      titulo="Prestações por situação"
      icone={<FileStack className="h-4 w-4 text-brand-500" />}
      subtitulo={`${anos.length} exercício(s) com prestação registrada`}
      acao={
        <Link
          to="/relatorios"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Detalhar
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <BarraEmpilhada linhas={barras} />

      <div className="mt-3">
        <Legenda itens={legenda} />
      </div>

      {/* O que não cabe no gráfico, porque não tem barra: ajuste sem nenhuma
          prestação não aparece em exercício nenhum. É a lacuna que a tela
          existe para revelar, então vai por escrito. */}
      {semPrestacao > 0 && (
        <p className="mt-3 flex items-start gap-1.5 border-t border-ink-100 pt-3 text-[11px] leading-relaxed text-ink-500 dark:border-ink-800 dark:text-ink-400">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            <strong className="font-medium text-ink-700 dark:text-ink-200">
              {semPrestacao} ajuste(s) sem nenhuma prestação
            </strong>{' '}
            — não aparecem no gráfico porque não têm exercício a que pertencer.
          </span>
        </p>
      )}
    </Figura>
  );
}
