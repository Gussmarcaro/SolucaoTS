import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apenasDigitos } from '@/lib/masks';
import { enterComoTab } from '@/lib/enterComoTab';
import { extrairMensagemErro } from '@/services/http';
import { dadosGeraisApi, responsaveisApi } from '@/services/certidoesPrestacao.service';
import type { TipoAjuste } from '@/types/ajuste';
import { AlertaErro } from './_ui';

interface CampoDef {
  chave: string;
  label: string;
  ajuda?: string;
  oculto?: boolean;
}

interface BlocoApi {
  obter: (prestacaoId: string) => Promise<Record<string, string | null> | null>;
  salvar: (prestacaoId: string, payload: Record<string, string | null>) => Promise<unknown>;
}

function BlocoCertidoes({
  prestacaoId,
  api,
  campos,
  intro,
}: {
  prestacaoId: string;
  api: BlocoApi;
  campos: CampoDef[];
  intro: React.ReactNode;
}) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    api
      .obter(prestacaoId)
      .then((r) => {
        if (!vivo) return;
        const v: Record<string, string> = {};
        for (const c of campos) v[c.chave] = (r?.[c.chave] as string | null) ?? '';
        setValores(v);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar o bloco.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestacaoId]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      const payload: Record<string, string | null> = {};
      for (const c of campos) payload[c.chave] = valores[c.chave]?.trim() || null;
      await api.salvar(prestacaoId, payload);
      setSalvo(true);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o bloco.'));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <form onSubmit={salvar} onKeyDown={enterComoTab} className="space-y-4">
      {intro}
      {erro && <AlertaErro msg={erro} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campos
          .filter((c) => !c.oculto)
          .map((c) => (
            <div key={c.chave}>
              <Input
                label={c.label}
                name={c.chave}
                value={valores[c.chave] ?? ''}
                onChange={(e) => {
                  // O schema exige exatamente 10 dígitos (^[0-9]{10}$).
                  setValores((v) => ({ ...v, [c.chave]: apenasDigitos(e.target.value).slice(0, 10) }));
                  setSalvo(false);
                }}
                placeholder="0000000000"
                inputMode="numeric"
                error={
                  (valores[c.chave] ?? '').length > 0 && (valores[c.chave] ?? '').length !== 10
                    ? 'A identificação da certidão tem 10 dígitos.'
                    : undefined
                }
              />
              {c.ajuda && <p className="mt-1 text-xs text-ink-400">{c.ajuda}</p>}
            </div>
          ))}
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        {salvo && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Salvo.
          </span>
        )}
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200/70 bg-ink-50 px-4 py-3 text-xs text-ink-500 dark:border-ink-800/70 dark:bg-ink-950 dark:text-ink-400">
      {children}
    </div>
  );
}

const ROTULO_DADOS_GERAIS: Record<TipoAjuste, string> = {
  CONTRATO_GESTAO: 'Dados Gerais - OS',
  CONVENIO: 'Dados Gerais - Conveniada',
  TERMO_COLABORACAO: 'Dados Gerais - OSC',
  TERMO_FOMENTO: 'Dados Gerais - OSC',
  TERMO_PARCERIA: 'Dados Gerais - OSCIP',
};

export function DadosGeraisTab({ prestacaoId, ajusteTipo }: { prestacaoId: string; ajusteTipo: TipoAjuste }) {
  const soContratoGestao = ajusteTipo === 'CONTRATO_GESTAO';
  const campos: CampoDef[] = [
    { chave: 'identCertidaoDadosGerais', label: 'Certidão de Dados Gerais', ajuda: `Tipo: ${ROTULO_DADOS_GERAIS[ajusteTipo]}.` },
    { chave: 'identCertidaoCorpoDiretivo', label: 'Certidão do Corpo Diretivo', ajuda: 'Tipo: Corpo Diretivo (Prestação de contas) — vigente no exercício.' },
    { chave: 'identCertidaoMembrosConselho', label: 'Certidão dos Membros do Conselho', ajuda: 'Tipo: Conselho (Prestação de contas) — vigente no exercício.' },
    { chave: 'identCertidaoResponsaveis', label: 'Certidão dos Responsáveis (Entidade Gerenciada)', ajuda: 'Somente Contrato de Gestão.', oculto: !soContratoGestao },
  ];
  return (
    <BlocoCertidoes
      prestacaoId={prestacaoId}
      api={dadosGeraisApi as unknown as BlocoApi}
      campos={campos}
      intro={
        <Nota>
          Informe a <strong>identificação</strong> das certidões cadastradas e concluídas no Audesp Fase V (entidade beneficiária). Não são certidões locais — o TCESP valida cada uma na recepção.
        </Nota>
      }
    />
  );
}

export function ResponsaveisTab({ prestacaoId, ajusteTipo }: { prestacaoId: string; ajusteTipo: TipoAjuste }) {
  const temFiscalizacao = ajusteTipo === 'CONVENIO' || ajusteTipo === 'TERMO_COLABORACAO' || ajusteTipo === 'TERMO_FOMENTO';
  const campos: CampoDef[] = [
    { chave: 'identCertidaoResponsaveis', label: 'Certidão dos Responsáveis', ajuda: 'Responsáveis pelo órgão concessor.' },
    { chave: 'identCertidaoComissaoAvaliacao', label: 'Certidão da Comissão de Avaliação', ajuda: 'Membros da comissão de avaliação.' },
    { chave: 'identCertidaoControleInterno', label: 'Certidão do Controle Interno', ajuda: 'Membros do controle interno.' },
    { chave: 'identCertidaoFiscalizacaoExecucao', label: 'Certidão da Fiscalização da Execução', ajuda: 'Somente Convênio, Termo de Colaboração e Fomento.', oculto: !temFiscalizacao },
  ];
  return (
    <BlocoCertidoes
      prestacaoId={prestacaoId}
      api={responsaveisApi as unknown as BlocoApi}
      campos={campos}
      intro={
        <Nota>
          Identificação das certidões do <strong>órgão concessor</strong> no Audesp Fase V, com vigência que compreenda o período da prestação.
        </Nota>
      }
    />
  );
}
