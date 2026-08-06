import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, Send, ServerCrash, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { buscarPrestacao, excluirPrestacao } from '@/services/prestacoes.service';
import { extrairMensagemErro } from '@/services/http';
import { TIPO_AJUSTE_LABEL } from '@/types/ajuste';
import {
  STATUS_PRESTACAO_LABEL,
  STATUS_PRESTACAO_TONE,
  blocosAplicaveis,
  type Prestacao,
} from '@/types/prestacao';

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor}</dd>
    </div>
  );
}

export function PrestacaoDetalhe() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [prestacao, setPrestacao] = useState<Prestacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    buscarPrestacao(id)
      .then((r) => vivo && setPrestacao(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar a prestação.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [id]);

  if (carregando) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;
  }
  if (erro || !prestacao) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <ServerCrash className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-ink-600 dark:text-ink-300">{erro ?? 'Prestação não encontrada.'}</p>
        <Link to="/prestacao-contas"><Button variant="secondary" size="sm"><ArrowLeft className="h-4 w-4" />Voltar</Button></Link>
      </div>
    );
  }

  const emElaboracao = prestacao.status === 'EM_ELABORACAO';
  const blocos = blocosAplicaveis(prestacao.ajusteTipo);

  async function confirmarExclusao() {
    setExcluindo(true);
    setErroExcluir(null);
    try {
      await excluirPrestacao(id);
      navigate('/prestacao-contas');
    } catch (e) {
      setErroExcluir(extrairMensagemErro(e, 'Não foi possível excluir.'));
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <Link to="/prestacao-contas" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" />
          Prestações
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight text-ink-900 dark:text-ink-50">{prestacao.ajusteCodigo}</h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{prestacao.entidadeNome}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{TIPO_AJUSTE_LABEL[prestacao.ajusteTipo] ?? prestacao.tipoDocumento}</Badge>
              <Badge tone={STATUS_PRESTACAO_TONE[prestacao.status]}>{STATUS_PRESTACAO_LABEL[prestacao.status]}</Badge>
              <span className="text-sm font-medium text-ink-600 dark:text-ink-300">Exercício {prestacao.ano} · mês {prestacao.mes}</span>
              {prestacao.ehRetificacao && <Badge tone="neutral">Retificação</Badge>}
            </div>
          </div>
          {emElaboracao && (
            <Button variant="secondary" onClick={() => setConfirmar(true)}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Descritor */}
      <div className="mb-6 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <h2 className="mb-4 text-sm font-semibold text-ink-700 dark:text-ink-200">Descritor do documento</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Campo label="Tipo documento" valor={TIPO_AJUSTE_LABEL[prestacao.ajusteTipo] ?? prestacao.tipoDocumento} />
          <Campo label="Código do ajuste" valor={prestacao.ajusteCodigo} />
          <Campo label="Ano" valor={String(prestacao.ano)} />
          <Campo label="Mês" valor={String(prestacao.mes)} />
          <Campo label="Protocolo" valor={prestacao.protocolo ?? '—'} />
          <Campo label="Data de envio" valor={prestacao.dataEnvio ? new Date(prestacao.dataEnvio).toLocaleString('pt-BR') : '—'} />
        </dl>
      </div>

      {/* Blocos */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-200">Blocos do documento ({blocos.length})</h2>
          <span className="text-xs text-ink-400">Aplicáveis a {TIPO_AJUSTE_LABEL[prestacao.ajusteTipo] ?? prestacao.tipoDocumento}</span>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {blocos.map((b) => (
            <li key={b.chave} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm dark:border-ink-800">
              <Circle className="h-4 w-4 shrink-0 text-ink-300" />
              <span className="flex-1 text-ink-700 dark:text-ink-200">{b.nome}</span>
              <Badge tone="neutral">pendente</Badge>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-ink-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Os blocos serão preenchidos pelos módulos de execução (próxima fase).
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled title="Disponível após os blocos de dados">
              <ShieldCheck className="h-4 w-4" />
              Validar
            </Button>
            <Button size="sm" disabled title="Disponível após montar e validar o JSON">
              <Send className="h-4 w-4" />
              Transmitir (piloto)
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <Modal
        open={confirmar}
        onClose={() => setConfirmar(false)}
        title="Excluir prestação"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)} disabled={excluindo}>Cancelar</Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Deseja excluir a prestação do exercício <span className="font-semibold text-ink-900 dark:text-ink-50">{prestacao.ano}</span> do ajuste {prestacao.ajusteCodigo}? Esta ação não pode ser desfeita.
        </p>
        {erroExcluir && <p className="mt-2 text-sm font-medium text-red-500">{erroExcluir}</p>}
      </Modal>
    </>
  );
}
