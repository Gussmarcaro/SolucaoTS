import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { mascaraCpfCnpj } from '@/lib/masks';
import {
  VEICULO_PUBLICACAO,
  TIPO_PARECER_ATA,
  CONCLUSAO_PARECER_ATA,
} from '@/lib/dominiosDeclaratorios';
import {
  demonstracoesApi,
  publicacaoParecerAtaApi,
  publicacaoRelAtividadesApi,
  prestacaoEntidadeApi,
} from '@/services/publicacoesPrestacao.service';
import type {
  Demonstracoes,
  ItemParecerAta,
  Publicacao,
  PublicacaoParecerAta,
  PublicacaoRelAtividades,
  PrestacaoEntidade,
} from '@/types/prestacaoBlocos9';
import { AlertaErro, IconBtn } from './_ui';
import { BarraSalvar, BoolSelect, Carregando, Nota, useBloco } from './DeclaratoriosTabs';

const opcoesNum = (m: Record<number, string>) => Object.entries(m).map(([v, l]) => ({ value: v, label: l }));

// ---------- Editor de publicações (reutilizado) ----------
function PublicacoesEditor({ lista, onChange }: { lista: Publicacao[]; onChange: (l: Publicacao[]) => void }) {
  const add = () => onChange([...lista, { tipoVeiculo: null, nomeVeiculo: '', dataPublicacao: '', enderecoInternet: '' }]);
  const upd = (i: number, p: Partial<Publicacao>) => onChange(lista.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const rm = (i: number) => onChange(lista.filter((_, j) => j !== i));

  return (
    <div className="space-y-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Publicações</p>
        <Button size="sm" variant="secondary" onClick={add}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>
      {lista.map((p, i) => (
        <div key={i} className="flex items-start gap-2 border-t border-ink-100 pt-2 first:border-0 first:pt-0 dark:border-ink-800">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            <Select label="Veículo" name={`veic-${i}`} value={p.tipoVeiculo != null ? String(p.tipoVeiculo) : ''} onChange={(e) => upd(i, { tipoVeiculo: e.target.value ? Number(e.target.value) : null })} options={opcoesNum(VEICULO_PUBLICACAO)} placeholder="Selecione..." />
            <Input label="Data da publicação" name={`data-${i}`} type="date" value={p.dataPublicacao ?? ''} onChange={(e) => upd(i, { dataPublicacao: e.target.value })} />
            {p.tipoVeiculo === 10 && (
              <Input label="Nome do veículo (Outros)" name={`nome-${i}`} value={p.nomeVeiculo ?? ''} onChange={(e) => upd(i, { nomeVeiculo: e.target.value })} />
            )}
            <Input label="Endereço na internet" name={`url-${i}`} value={p.enderecoInternet ?? ''} onChange={(e) => upd(i, { enderecoInternet: e.target.value })} placeholder="https://..." />
          </div>
          <IconBtn title="Remover" danger onClick={() => rm(i)}><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      ))}
      {lista.length === 0 && <p className="text-xs text-ink-400">Nenhuma publicação adicionada.</p>}
    </div>
  );
}

// ---------- Bloco 28 — Demonstrações Contábeis ----------
const DEMONSTRACOES_VAZIO: Demonstracoes = { publicacoes: [], respNumeroCrc: null, respCpf: null, respSituacaoRegular: null };

export function DemonstracoesContabeisTab({ prestacaoId }: { prestacaoId: string }) {
  const { dados, patch, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, demonstracoesApi, DEMONSTRACOES_VAZIO);
  if (carregando) return <Carregando />;
  return (
    <div className="space-y-4">
      <Nota>Publicação das demonstrações contábeis da entidade beneficiária + identificação do responsável (contador).</Nota>
      {erro && <AlertaErro msg={erro} />}
      <PublicacoesEditor lista={dados.publicacoes} onChange={(l) => patch({ publicacoes: l })} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Nº do CRC (responsável)" name="crc" value={dados.respNumeroCrc ?? ''} onChange={(e) => patch({ respNumeroCrc: e.target.value })} placeholder="ex.: 1SP000001" />
        <Input label="CPF do responsável" name="cpf" value={mascaraCpfCnpj(dados.respCpf ?? '')} onChange={(e) => patch({ respCpf: e.target.value })} inputMode="numeric" />
        <BoolSelect label="CRC regular na elaboração?" value={dados.respSituacaoRegular} onChange={(v) => patch({ respSituacaoRegular: v })} />
      </div>
      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}

// ---------- Bloco 29 — Publicações de Parecer ou Ata ----------
const PARECER_ATA_VAZIO: PublicacaoParecerAta = { itens: [] };

export function PublicacaoParecerAtaTab({ prestacaoId }: { prestacaoId: string }) {
  const { dados, patch, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, publicacaoParecerAtaApi, PARECER_ATA_VAZIO);
  if (carregando) return <Carregando />;

  const upd = (i: number, p: Partial<ItemParecerAta>) => patch({ itens: dados.itens.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  const add = () => patch({ itens: [...dados.itens, { tipoParecerAta: 1, houvePublicacao: null, publicacoes: [], conclusaoParecer: null }] });
  const rm = (i: number) => patch({ itens: dados.itens.filter((_, j) => j !== i) });

  return (
    <div className="space-y-4">
      <Nota>Pareceres/atas emitidos (no máximo um de cada tipo). A obrigatoriedade varia por tipo de ajuste.</Nota>
      {erro && <AlertaErro msg={erro} />}
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={add}><Plus className="h-4 w-4" />Adicionar parecer/ata</Button>
      </div>
      {dados.itens.map((it, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
              <Select label="Tipo" name={`tipo-${i}`} value={String(it.tipoParecerAta)} onChange={(e) => upd(i, { tipoParecerAta: Number(e.target.value) })} options={opcoesNum(TIPO_PARECER_ATA)} />
              <Select label="Conclusão" name={`conc-${i}`} value={it.conclusaoParecer != null ? String(it.conclusaoParecer) : ''} onChange={(e) => upd(i, { conclusaoParecer: e.target.value ? Number(e.target.value) : null })} options={opcoesNum(CONCLUSAO_PARECER_ATA)} placeholder="—" />
              <BoolSelect label="Houve publicação?" value={it.houvePublicacao} onChange={(v) => upd(i, { houvePublicacao: v })} />
            </div>
            <IconBtn title="Remover" danger onClick={() => rm(i)}><Trash2 className="h-4 w-4" /></IconBtn>
          </div>
          {it.houvePublicacao && <PublicacoesEditor lista={it.publicacoes} onChange={(l) => upd(i, { publicacoes: l })} />}
        </div>
      ))}
      {dados.itens.length === 0 && <p className="text-xs text-ink-400">Nenhum parecer/ata informado.</p>}
      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}

// ---------- Bloco 30 — Publicação do Relatório de Atividades ----------
const REL_ATIV_VAZIO: PublicacaoRelAtividades = { houvePublicacaoExercicio: null, publicacoes: [] };

export function PublicacaoRelAtividadesTab({ prestacaoId }: { prestacaoId: string }) {
  const { dados, patch, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, publicacaoRelAtividadesApi, REL_ATIV_VAZIO);
  if (carregando) return <Carregando />;
  return (
    <div className="space-y-4">
      <Nota>Publicação do relatório de atividades no exercício (aplica-se a Contrato de Gestão).</Nota>
      {erro && <AlertaErro msg={erro} />}
      <BoolSelect label="Houve publicação do relatório no exercício?" value={dados.houvePublicacaoExercicio} onChange={(v) => patch({ houvePublicacaoExercicio: v })} />
      {dados.houvePublicacaoExercicio && <PublicacoesEditor lista={dados.publicacoes} onChange={(l) => patch({ publicacoes: l })} />}
      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}

// ---------- Bloco 32 — Prestação de Contas da Entidade ----------
const PREST_ENT_VAZIO: PrestacaoEntidade = { dataPrestacao: null, periodoReferenciaInicial: null, periodoReferenciaFinal: null };

export function PrestacaoContasEntidadeTab({ prestacaoId }: { prestacaoId: string }) {
  const { dados, patch, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, prestacaoEntidadeApi, PREST_ENT_VAZIO);
  if (carregando) return <Carregando />;
  return (
    <div className="space-y-4">
      <Nota>Conclusão da prestação de contas do exercício pela entidade beneficiária e o período de referência.</Nota>
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Data da prestação" name="dataPrest" type="date" value={dados.dataPrestacao ?? ''} onChange={(e) => patch({ dataPrestacao: e.target.value })} />
        <Input label="Período — data inicial" name="periIni" type="date" value={dados.periodoReferenciaInicial ?? ''} onChange={(e) => patch({ periodoReferenciaInicial: e.target.value })} />
        <Input label="Período — data final" name="periFim" type="date" value={dados.periodoReferenciaFinal ?? ''} onChange={(e) => patch({ periodoReferenciaFinal: e.target.value })} />
      </div>
      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}
