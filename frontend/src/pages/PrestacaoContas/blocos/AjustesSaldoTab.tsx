import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apenasDigitos, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { ajustesSaldoApi } from '@/services/contratosPrestacao.service';
import type {
  AjustesSaldo,
  InclusaoPagamento,
  InclusaoRepasse,
  RetificacaoPagamento,
  RetificacaoRepasse,
} from '@/types/prestacaoBlocos11';
import { AlertaErro, IconBtn } from './_ui';
import { BarraSalvar, Carregando, Nota, useBloco } from './DeclaratoriosTabs';

const VAZIO: AjustesSaldo = { retificacaoRepasses: [], inclusaoRepasses: [], retificacaoPagamentos: [], inclusaoPagamentos: [] };

function Moeda({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number | null) => void }) {
  return (
    <Input
      label={label}
      value={value != null ? numeroParaMascaraMoeda(value) : ''}
      onChange={(e) => {
        const m = mascaraMoeda(e.target.value);
        onChange(m ? moedaParaNumero(m) : null);
      }}
      inputMode="numeric"
      placeholder="0,00"
    />
  );
}

function NumCodigo({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number | null) => void }) {
  return (
    <Input label={label} value={value != null ? String(value) : ''} onChange={(e) => { const d = apenasDigitos(e.target.value); onChange(d ? Number(d) : null); }} inputMode="numeric" />
  );
}

function Secao<T>({ titulo, ajuda, itens, novo, onChange, children }: {
  titulo: string;
  ajuda?: string;
  itens: T[];
  novo: () => T;
  onChange: (l: T[]) => void;
  children: (item: T, upd: (p: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{titulo}</p>
        <Button size="sm" variant="secondary" onClick={() => onChange([...itens, novo()])}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>
      {ajuda && <p className="text-xs text-ink-400">{ajuda}</p>}
      {itens.map((it, i) => (
        <div key={i} className="flex items-start gap-2 border-t border-ink-100 pt-2 first:border-0 first:pt-0 dark:border-ink-800">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            {children(it, (p) => onChange(itens.map((x, j) => (j === i ? { ...x, ...p } : x))))}
          </div>
          <IconBtn title="Remover" danger onClick={() => onChange(itens.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      ))}
      {itens.length === 0 && <p className="text-xs text-ink-400">Nenhum item.</p>}
    </div>
  );
}

export function AjustesSaldoTab({ prestacaoId }: { prestacaoId: string }) {
  const { dados, patch, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, ajustesSaldoApi, VAZIO);
  if (carregando) return <Carregando />;

  return (
    <div className="space-y-4">
      <Nota>
        Retificação e inclusão de <strong>repasses e pagamentos de exercícios anteriores</strong> (já armazenados no TCESP). Em retificação, informe valor <strong>zero</strong> para cancelar o lançamento.
      </Nota>
      {erro && <AlertaErro msg={erro} />}

      <Secao<RetificacaoRepasse>
        titulo="Retificação de repasses"
        itens={dados.retificacaoRepasses}
        novo={() => ({ dataPrevista: '', dataRepasse: '', fonteRecursoTipo: null, valorRetificado: null })}
        onChange={(l) => patch({ retificacaoRepasses: l })}
      >
        {(it, upd) => (
          <>
            <Input label="Data prevista" type="date" value={it.dataPrevista ?? ''} onChange={(e) => upd({ dataPrevista: e.target.value })} />
            <Input label="Data do repasse" type="date" value={it.dataRepasse ?? ''} onChange={(e) => upd({ dataRepasse: e.target.value })} />
            <NumCodigo label="Fonte de recurso" value={it.fonteRecursoTipo} onChange={(n) => upd({ fonteRecursoTipo: n })} />
            <Moeda label="Valor retificado" value={it.valorRetificado} onChange={(n) => upd({ valorRetificado: n })} />
          </>
        )}
      </Secao>

      <Secao<InclusaoRepasse>
        titulo="Inclusão de repasses"
        itens={dados.inclusaoRepasses}
        novo={() => ({ dataPrevista: '', dataRepasse: '', valor: null, fonteRecursoTipo: null })}
        onChange={(l) => patch({ inclusaoRepasses: l })}
      >
        {(it, upd) => (
          <>
            <Input label="Data prevista" type="date" value={it.dataPrevista ?? ''} onChange={(e) => upd({ dataPrevista: e.target.value })} />
            <Input label="Data do repasse" type="date" value={it.dataRepasse ?? ''} onChange={(e) => upd({ dataRepasse: e.target.value })} />
            <Moeda label="Valor" value={it.valor} onChange={(n) => upd({ valor: n })} />
            <NumCodigo label="Fonte de recurso" value={it.fonteRecursoTipo} onChange={(n) => upd({ fonteRecursoTipo: n })} />
          </>
        )}
      </Secao>

      <Secao<RetificacaoPagamento>
        titulo="Retificação de pagamentos"
        ajuda="Documento fiscal: nº 9999 para Folha Ordinária."
        itens={dados.retificacaoPagamentos}
        novo={() => ({ docNumero: '', docCredorTipo: null, docCredorNumero: '', pagamentoData: '', pagamentoValor: null, fonteRecursoTipo: null, valorRetificado: null })}
        onChange={(l) => patch({ retificacaoPagamentos: l })}
      >
        {(it, upd) => (
          <>
            <Input label="Nº doc. fiscal" value={it.docNumero ?? ''} onChange={(e) => upd({ docNumero: e.target.value })} />
            <NumCodigo label="Credor tipo (1/2/3)" value={it.docCredorTipo} onChange={(n) => upd({ docCredorTipo: n })} />
            <Input label="Credor nº doc." value={it.docCredorNumero ?? ''} onChange={(e) => upd({ docCredorNumero: e.target.value })} inputMode="numeric" />
            <Input label="Data do pagamento" type="date" value={it.pagamentoData ?? ''} onChange={(e) => upd({ pagamentoData: e.target.value })} />
            <Moeda label="Valor original" value={it.pagamentoValor} onChange={(n) => upd({ pagamentoValor: n })} />
            <NumCodigo label="Fonte de recurso" value={it.fonteRecursoTipo} onChange={(n) => upd({ fonteRecursoTipo: n })} />
            <Moeda label="Valor retificado" value={it.valorRetificado} onChange={(n) => upd({ valorRetificado: n })} />
          </>
        )}
      </Secao>

      <Secao<InclusaoPagamento>
        titulo="Inclusão de pagamentos"
        itens={dados.inclusaoPagamentos}
        novo={() => ({ docNumero: '', docCredorTipo: null, docCredorNumero: '', pagamentoData: '', pagamentoValor: null, fonteRecursoTipo: null, meioPagamento: null, banco: null, agencia: null, contaCorrente: '', numeroTransacao: '' })}
        onChange={(l) => patch({ inclusaoPagamentos: l })}
      >
        {(it, upd) => (
          <>
            <Input label="Nº doc. fiscal" value={it.docNumero ?? ''} onChange={(e) => upd({ docNumero: e.target.value })} />
            <NumCodigo label="Credor tipo (1/2/3)" value={it.docCredorTipo} onChange={(n) => upd({ docCredorTipo: n })} />
            <Input label="Credor nº doc." value={it.docCredorNumero ?? ''} onChange={(e) => upd({ docCredorNumero: e.target.value })} inputMode="numeric" />
            <Input label="Data do pagamento" type="date" value={it.pagamentoData ?? ''} onChange={(e) => upd({ pagamentoData: e.target.value })} />
            <Moeda label="Valor" value={it.pagamentoValor} onChange={(n) => upd({ pagamentoValor: n })} />
            <NumCodigo label="Fonte de recurso" value={it.fonteRecursoTipo} onChange={(n) => upd({ fonteRecursoTipo: n })} />
            <NumCodigo label="Meio pgto (1=Banco)" value={it.meioPagamento} onChange={(n) => upd({ meioPagamento: n })} />
            <NumCodigo label="Banco" value={it.banco} onChange={(n) => upd({ banco: n })} />
            <NumCodigo label="Agência" value={it.agencia} onChange={(n) => upd({ agencia: n })} />
            <Input label="Conta corrente" value={it.contaCorrente ?? ''} onChange={(e) => upd({ contaCorrente: e.target.value })} />
            <Input label="Nº transação" value={it.numeroTransacao ?? ''} onChange={(e) => upd({ numeroTransacao: e.target.value })} />
          </>
        )}
      </Secao>

      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}
