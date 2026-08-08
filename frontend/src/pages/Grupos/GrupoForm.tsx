import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { atualizarGrupo, criarGrupo } from '@/services/grupos.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { Grupo, GrupoPayload } from '@/types/grupo';

interface Props {
  grupo?: Grupo | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GrupoForm({ grupo, onSuccess, onCancel }: Props) {
  const editando = !!grupo;
  const [nome, setNome] = useState(grupo?.nome ?? '');
  const [descricao, setDescricao] = useState(grupo?.descricao ?? '');
  const [ativo, setAtivo] = useState(grupo?.ativo ?? true);
  const [erros, setErros] = useState<{ nome?: string }>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (nome.trim().length < 2) {
      setErros({ nome: 'Informe o nome do grupo.' });
      return;
    }
    const payload: GrupoPayload = { nome: nome.trim(), descricao: descricao.trim() || null, ativo };
    setSalvando(true);
    try {
      if (editando) await atualizarGrupo(grupo!.id, payload);
      else await criarGrupo(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o grupo.');
      if (codigo === 'GRUPO_DUPLICADO') setErros({ nome: msg });
      setAlerta(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormularioNovo novo={!editando}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        <Input label="Nome do Grupo *" name="nome" value={nome} onChange={(e) => { setNome(e.target.value); setErros({}); setAlerta(null); }} error={erros.nome} autoFocus />

        <div>
          <label htmlFor="descricao" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Descrição</label>
          <textarea
            id="descricao"
            name="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            placeholder="Finalidade do grupo (opcional)."
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800" />
          Grupo ativo (pode ser vinculado a usuários)
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Grupo'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
