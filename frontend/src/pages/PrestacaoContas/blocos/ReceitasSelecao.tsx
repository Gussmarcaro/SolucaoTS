import { SelecaoLancamentos } from './SelecaoLancamentos';
import { receitasSelecao } from '@/services/prestacaoBlocos2.service';
import { dataBr } from '@/lib/masks';
import { RECEITA_TIPO_LABEL, type Receita } from '@/types/prestacaoBlocos2';

/**
 * Receitas da prestação — seleção do que foi lançado no Financeiro.
 *
 * A receita é registrada quando o dinheiro entra, em Execução → Financeiro →
 * Receitas. Aqui a prestação escolhe quais entradas do exercício ela declara.
 */
export function ReceitasSelecao({ prestacaoId }: { prestacaoId: string }) {
  return (
    <SelecaoLancamentos<Receita>
      prestacaoId={prestacaoId}
      rotulo="receita"
      rotuloPlural="receitas"
      ondeSeLanca="Execução → Financeiro → Receitas"
      linkLancamento="/execucao/financeiro/receitas"
      carregarApropriados={receitasSelecao.apropriados}
      carregarCandidatos={receitasSelecao.candidatos}
      apropriar={receitasSelecao.apropriar}
      desapropriar={receitasSelecao.desapropriar}
      descrever={(r) => ({
        titulo: RECEITA_TIPO_LABEL[r.tipo],
        sub: [r.dataRepasse ? dataBr(r.dataRepasse) : 'sem data', r.descricao]
          .filter(Boolean)
          .join(' · '),
        busca: `${RECEITA_TIPO_LABEL[r.tipo]} ${r.descricao ?? ''}`,
      })}
    />
  );
}
