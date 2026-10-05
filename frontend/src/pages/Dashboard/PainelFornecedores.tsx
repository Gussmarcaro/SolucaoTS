import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { relatorioFornecedores } from '@/services/relatorios.service';
import type { ResumoFornecedores } from '@/pages/Relatorios/tipos';
import { BarrasEnfase, type BarraItem } from '@/components/graficos/BarrasEnfase';
import { Figura, moedaCompacta } from '@/components/graficos/base';
import { mascararDocumento } from '@/lib/dadosPessoais';

/** Quantos credores a barra mostra antes de virar lista ilegível. */
const NO_GRAFICO = 7;

/**
 * Concentração de fornecedores.
 *
 * **Não é um Pareto clássico**, e isso foi decisão: o Pareto de manual desenha
 * barras de valor com uma linha de acumulado por cima, em dois eixos y — a
 * forma mais comum de enganar o próprio leitor, porque a posição da linha
 * depende de uma escala que não é a das barras. Aqui há **um eixo só**, e o
 * acumulado vira o que sempre foi: uma frase ("3 credores concentram 80%") e a
 * cor das barras que o compõem.
 *
 * A pergunta que a tela responde é de fiscalização, não de contabilidade:
 * despesa concentrada em poucos credores é achado clássico do TCESP, e ninguém
 * olha para isso somando nota por nota.
 */
export function PainelFornecedores() {
  const [dados, setDados] = useState<ResumoFornecedores | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    relatorioFornecedores()
      .then((r) => vivo && setDados(r))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  // Some sozinho quando não há o que dizer. Cartão vazio na tela de entrada
  // ensina o usuário a ignorá-la — é o pior defeito que um painel pode ter.
  if (falhou || !dados || dados.linhas.length < 2) return null;

  const itens: BarraItem[] = dados.linhas.slice(0, NO_GRAFICO).map((l, i) => ({
    id: `${l.credorTipoDoc}-${l.credorNumeroDoc}-${i}`,
    rotulo: l.credorNome ?? mascararDocumento(l.credorNumeroDoc),
    sub: `${l.notas} nota(s)`,
    valor: l.valor,
    anotacao: `${l.percentual.toFixed(1).replace('.', ',')}%`,
    // A cor marca quem **forma** os 80%, não quem é grande: é a leitura de
    // concentração, e ela depende do acumulado, não do valor isolado.
    destaque: l.acumulado <= 80,
    dica: (
      <>
        <strong className="font-semibold">{l.credorNome ?? mascararDocumento(l.credorNumeroDoc)}</strong>
        <br />
        {l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em {l.notas} nota(s)
        <br />
        <span className="text-ink-400">acumulado até aqui: {l.acumulado.toFixed(1).replace('.', ',')}%</span>
      </>
    ),
  }));

  return (
    <Figura
      titulo="Concentração de fornecedores"
      icone={<Users className="h-4 w-4 text-brand-500" />}
      subtitulo={
        dados.credoresPara80 != null ? (
          <>
            <strong className="font-semibold text-ink-700 dark:text-ink-200">
              {dados.credoresPara80} de {dados.credores} credores
            </strong>{' '}
            concentram 80% da despesa · {moedaCompacta(dados.total)} no total
          </>
        ) : (
          <>
            {dados.credores} credores · {moedaCompacta(dados.total)} no total
          </>
        )
      }
      acao={
        <Link
          to="/relatorios"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <BarrasEnfase itens={itens} />
      {/* A cor precisa de explicação porque não é identidade nem magnitude: é
          pertencimento a um recorte. Sem a frase, o cinza parece defeito. */}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        Em cor, os credores que somam os primeiros 80% da despesa.
      </p>
    </Figura>
  );
}
