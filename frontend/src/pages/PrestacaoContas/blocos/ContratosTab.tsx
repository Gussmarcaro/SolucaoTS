import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { apenasDigitos, dataBr, formatarMoeda, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { contratosApi } from '@/services/contratosPrestacao.service';
import type { ContratoPayload, ContratoPrestacao, CredorTipoDoc, VigenciaTipo } from '@/types/prestacaoBlocos11';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: ContratoPrestacao | null } | { tipo: 'excluir'; item: ContratoPrestacao };

const TIPO_DOC = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'RNE', label: 'RNE (estrangeiro)' },
];
const TIPO_VIGENCIA = [
  { value: 'PRE_ESTABELECIDA', label: 'Pré-estabelecida' },
  { value: 'INDETERMINADA', label: 'Indeterminada' },
];

export function ContratosTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<ContratoPrestacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    contratosApi
      .listar(prestacaoId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os contratos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} contrato(s)` : 'Contratos vigentes no período celebrados pela beneficiária.'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Número</th>
              <th className="px-4 py-2.5">Credor</th>
              <th className="px-4 py-2.5">Assinatura</th>
              <th className="px-4 py-2.5 text-right">Valor</th>
              <th className="px-4 py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></td></tr>
            ) : erro ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-red-500">{erro}</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">Nenhum contrato cadastrado.</td></tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-200">{i.numero}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{i.credorNome || mascaraCpfCnpj(i.credorNumeroDoc)}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(i.dataAssinatura)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valorMontante)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: i })}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: i })}><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Contrato' : 'Novo Contrato'} size="2xl">
        {modal.tipo === 'form' && <ContratoForm prestacaoId={prestacaoId} item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="este contrato"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await contratosApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function ContratoForm({ prestacaoId, item, onSuccess, onCancel }: { prestacaoId: string; item: ContratoPrestacao | null; onSuccess: () => void; onCancel: () => void }) {
  const [numero, setNumero] = useState(item?.numero ?? '');
  const [credorTipoDoc, setCredorTipoDoc] = useState<CredorTipoDoc>(item?.credorTipoDoc ?? 'CNPJ');
  const [credorNumeroDoc, setCredorNumeroDoc] = useState(item ? mascaraCpfCnpj(item.credorNumeroDoc) : '');
  const [credorNome, setCredorNome] = useState(item?.credorNome ?? '');
  const [dataAssinatura, setDataAssinatura] = useState(item?.dataAssinatura ?? '');
  const [vigenciaTipo, setVigenciaTipo] = useState<VigenciaTipo>(item?.vigenciaTipo ?? 'PRE_ESTABELECIDA');
  const [vigInicial, setVigInicial] = useState(item?.vigenciaDataInicial ?? '');
  const [vigFinal, setVigFinal] = useState(item?.vigenciaDataFinal ?? '');
  const [objeto, setObjeto] = useState(item?.objeto ?? '');
  const [naturezaTexto, setNaturezaTexto] = useState(item ? item.naturezaContratacao.join(', ') : '');
  const [naturezaOutro, setNaturezaOutro] = useState(item?.naturezaOutro ?? '');
  const [criterio, setCriterio] = useState(item?.criterioSelecao != null ? String(item.criterioSelecao) : '');
  const [criterioOutro, setCriterioOutro] = useState(item?.criterioSelecaoOutro ?? '');
  const [artigo, setArtigo] = useState(item?.artigoRegulamentoCompras ?? '');
  const [valor, setValor] = useState(item ? numeroParaMascaraMoeda(item.valorMontante) : '');
  const [valorTipo, setValorTipo] = useState(item?.valorTipo != null ? String(item.valorTipo) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const natureza = naturezaTexto.split(',').map((s) => Number(apenasDigitos(s))).filter((n) => Number.isInteger(n) && n > 0);
  const ehRne = credorTipoDoc === 'RNE';

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero.trim()) return setErro('Informe o número do contrato.');
    if (!dataAssinatura) return setErro('Informe a data de assinatura.');
    if (!vigInicial) return setErro('Informe o início da vigência.');
    if (vigenciaTipo === 'PRE_ESTABELECIDA' && !vigFinal) return setErro('Informe o fim da vigência (pré-estabelecida).');
    if (!objeto.trim()) return setErro('Informe o objeto.');
    if (moedaParaNumero(valor) < 0) return setErro('Valor inválido.');

    const payload: ContratoPayload = {
      numero: numero.trim(),
      credorTipoDoc,
      credorNumeroDoc: ehRne ? credorNumeroDoc.trim() : apenasDigitos(credorNumeroDoc),
      credorNome: credorNome.trim() || null,
      dataAssinatura,
      vigenciaTipo,
      vigenciaDataInicial: vigInicial,
      vigenciaDataFinal: vigenciaTipo === 'PRE_ESTABELECIDA' ? vigFinal || null : null,
      objeto: objeto.trim(),
      naturezaContratacao: natureza,
      naturezaOutro: natureza.includes(23) ? naturezaOutro.trim() || null : null,
      criterioSelecao: criterio ? Number(criterio) : null,
      criterioSelecaoOutro: Number(criterio) === 4 ? criterioOutro.trim() || null : null,
      artigoRegulamentoCompras: artigo.trim() || null,
      valorMontante: moedaParaNumero(valor),
      valorTipo: valorTipo ? Number(valorTipo) : null,
    };
    setSalvando(true);
    try {
      if (item) await contratosApi.atualizar(prestacaoId, item.id, payload);
      else await contratosApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o contrato.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Número do contrato *" name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Input label="Data de assinatura *" name="assinatura" type="date" value={dataAssinatura} onChange={(e) => setDataAssinatura(e.target.value)} />

        <Select label="Tipo doc. do credor *" name="tipoDoc" value={credorTipoDoc} onChange={(e) => setCredorTipoDoc(e.target.value as CredorTipoDoc)} options={TIPO_DOC} />
        <Input label={ehRne ? 'Número do documento *' : `${credorTipoDoc} do credor *`} name="credorNum" value={ehRne ? credorNumeroDoc : mascaraCpfCnpj(credorNumeroDoc)} onChange={(e) => setCredorNumeroDoc(e.target.value)} inputMode={ehRne ? 'text' : 'numeric'} />
        <div className="sm:col-span-2">
          <Input label={`Nome/Razão social do credor${ehRne ? ' *' : ''}`} name="credorNome" value={credorNome} onChange={(e) => setCredorNome(e.target.value)} />
        </div>

        <Select label="Tipo de vigência *" name="vigTipo" value={vigenciaTipo} onChange={(e) => setVigenciaTipo(e.target.value as VigenciaTipo)} options={TIPO_VIGENCIA} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Vigência (início) *" name="vigIni" type="date" value={vigInicial} onChange={(e) => setVigInicial(e.target.value)} />
          <Input label="Vigência (fim)" name="vigFim" type="date" value={vigFinal} onChange={(e) => setVigFinal(e.target.value)} disabled={vigenciaTipo === 'INDETERMINADA'} />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Objeto *</label>
          <textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} rows={2} className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100" />
        </div>

        <Input label="Natureza da contratação (códigos, ex.: 5, 23)" name="natureza" value={naturezaTexto} onChange={(e) => setNaturezaTexto(e.target.value)} inputMode="numeric" />
        {natureza.includes(23) && <Input label="Descrição de outros serviços (natureza 23) *" name="natOutro" value={naturezaOutro} onChange={(e) => setNaturezaOutro(e.target.value)} />}

        <Input label="Critério de seleção (código)" name="criterio" value={apenasDigitos(criterio)} onChange={(e) => setCriterio(e.target.value)} inputMode="numeric" />
        {Number(criterio) === 4 && <Input label="Descrição de outro critério (critério 4) *" name="critOutro" value={criterioOutro} onChange={(e) => setCriterioOutro(e.target.value)} />}

        <Input label="Artigo do regulamento de compras" name="artigo" value={artigo} onChange={(e) => setArtigo(e.target.value)} placeholder="Obrigatório p/ Contrato de Gestão e Termo de Parceria" />
        <Input label="Valor do contrato (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Tipo de valor (código)" name="valorTipo" value={apenasDigitos(valorTipo)} onChange={(e) => setValorTipo(e.target.value)} inputMode="numeric" />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
