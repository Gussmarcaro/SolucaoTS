import { ExternalLink, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { HistoricoRegistro } from '@/pages/Auditoria/HistoricoRegistro';
import { mascaraCep, mascaraCelular, mascaraCpfCnpj, mascaraTelefoneFixo } from '@/lib/masks';
import { abrirEstatuto } from '@/services/entidades.service';
import type { Entidade } from '@/types/entidade';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

export function EntidadeView({ entidade }: { entidade: Entidade }) {
  const endereco = [entidade.logradouro, entidade.numero, entidade.complemento]
    .filter(Boolean)
    .join(', ');
  const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : null);
  const constituicao = data(entidade.dataConstituicao);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{entidade.razaoSocial}</h3>
        {entidade.nomeFantasia && <p className="text-sm text-ink-500">{entidade.nomeFantasia}</p>}
        <div className="mt-1">
          <Badge tone={entidade.ativo ? 'success' : 'neutral'}>
            {entidade.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Campo label="CNPJ" valor={mascaraCpfCnpj(entidade.cnpj)} />
        <Campo label="Inscrição Estadual" valor={entidade.inscricaoEstadual} />
        <Campo label="Inscrição Municipal" valor={entidade.inscricaoMunicipal} />
        <Campo label="Data de Constituição" valor={constituicao} />
        <Campo label="E-mail" valor={entidade.email} />
        <Campo label="Telefone Fixo" valor={entidade.telefoneFixo ? mascaraTelefoneFixo(entidade.telefoneFixo) : null} />
        <Campo label="Celular / WhatsApp" valor={entidade.whatsapp ? mascaraCelular(entidade.whatsapp) : null} />
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Endereço" valor={endereco} />
        </div>
        <Campo label="Bairro" valor={entidade.bairro} />
        <Campo label="Cidade / UF" valor={`${entidade.cidade} / ${entidade.uf}`} />
        <Campo label="CEP" valor={mascaraCep(entidade.cep)} />
      </dl>

      <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
        <h4 className="mb-3 text-sm font-medium text-ink-700 dark:text-ink-200">Finalidade Estatutária</h4>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Campo label="Descrição" valor={entidade.finalidadeDescricao} />
          </div>
          <Campo label="Artigo Estatuto" valor={entidade.finalidadeArtigo} />
        </dl>
      </div>

      <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
        <h4 className="mb-3 text-sm font-medium text-ink-700 dark:text-ink-200">Estatuto</h4>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Campo label="Data Inicial" valor={data(entidade.estatutoDataInicial)} />
          <Campo label="Data Alteração" valor={data(entidade.estatutoDataAlteracao)} />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">Arquivo</dt>
            <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">
              {entidade.estatutoArquivoNome ? (
                <button
                  type="button"
                  onClick={() => abrirEstatuto(entidade.id)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded text-brand-600 hover:underline dark:text-brand-400"
                >
                  <FileText className="h-4 w-4" />
                  <span className="truncate" title={entidade.estatutoArquivoNome}>{entidade.estatutoArquivoNome}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Histórico de alterações</h4>
        <HistoricoRegistro entidade="EntidadeBeneficiaria" registroId={entidade.id} />
      </div>
    </div>
  );
}
