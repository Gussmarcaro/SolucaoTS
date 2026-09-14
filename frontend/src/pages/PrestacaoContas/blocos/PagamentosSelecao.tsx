import { SelecaoLancamentos } from './SelecaoLancamentos';
import { pagamentosSelecao } from '@/services/prestacaoBlocos.service';
import { dataBr } from '@/lib/masks';
import type { Pagamento } from '@/types/prestacaoBlocos';

/**
 * Pagamentos da prestação — seleção do que foi lançado no Financeiro.
 *
 * O pagamento é registrado quando o dinheiro sai, em Execução → Financeiro →
 * Pagamentos. Aqui a prestação escolhe quais saídas do exercício ela declara.
 */
export function PagamentosSelecao({ prestacaoId }: { prestacaoId: string }) {
  return (
    <SelecaoLancamentos<Pagamento>
      prestacaoId={prestacaoId}
      rotulo="pagamento"
      rotuloPlural="pagamentos"
      ondeSeLanca="Execução → Financeiro → Pagamentos"
      linkLancamento="/execucao/financeiro/pagamentos"
      carregarApropriados={pagamentosSelecao.apropriados}
      carregarCandidatos={pagamentosSelecao.candidatos}
      apropriar={pagamentosSelecao.apropriar}
      desapropriar={pagamentosSelecao.desapropriar}
      descrever={(p) => ({
        // Sem documento é a folha (nº 9999 no envio) — e nomeá-la é o que
        // permite reconhecê-la no meio de centenas de linhas.
        titulo: p.documentoNumero ? `Doc. nº ${p.documentoNumero}` : 'Folha de pagamento',
        sub: `${dataBr(p.dataPagamento)} · ${p.meioPagamento === 'BANCO' ? 'Banco' : 'Fundo fixo'}`,
        busca: `${p.documentoNumero ?? 'folha'} ${p.dataPagamento}`,
      })}
    />
  );
}
