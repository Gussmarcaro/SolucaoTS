import { Suspense, lazy, type ComponentType } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RequerGrupo } from '@/components/auth/RequerGrupo';
import { RequerPermissao } from '@/components/auth/RequerPermissao';
import { LimiteDeCarga } from '@/components/layout/LimiteDeCarga';
import { GRUPOS_ADMIN } from '@/lib/navigation';

// Estas três são o caminho de entrada e vão no pedaço inicial, junto do
// layout: adiar o Login seria trocar a primeira tela por um spinner, e o
// Dashboard é sempre o que vem logo depois dele.
import { Login } from '@/pages/auth/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Placeholder } from '@/pages/Placeholder';

/**
 * Cada tela no seu próprio pedaço, baixado quando se entra nela.
 *
 * Antes tudo vinha num arquivo só, e a tela de login esperava pelo Espelho,
 * pelos Relatórios e pela Agenda antes de aparecer — telas que a maioria dos
 * usuários não abre no dia. Conexão de órgão público não perdoa isso.
 *
 * O `lazy` do React quer um `default`, e as páginas aqui são exportações
 * nomeadas; este ajudante faz a ponte. O `import()` continua literal no código,
 * que é o que o Vite precisa enxergar para separar os pedaços — passar o
 * caminho por variável desativaria a divisão inteira, em silêncio.
 */
function pagina<M, K extends keyof M>(carregar: () => Promise<M>, nome: K) {
  return lazy(() => carregar().then((m) => ({ default: m[nome] as ComponentType })));
}

const EsqueciSenha = pagina(() => import('@/pages/auth/EsqueciSenha'), 'EsqueciSenha');
const RedefinirSenha = pagina(() => import('@/pages/auth/RedefinirSenha'), 'RedefinirSenha');
const Perfil = pagina(() => import('@/pages/Perfil'), 'Perfil');

const Ajustes = pagina(() => import('@/pages/Ajustes'), 'Ajustes');
const AjusteDetalhe = pagina(() => import('@/pages/Ajustes/AjusteDetalhe'), 'AjusteDetalhe');
const Entidades = pagina(() => import('@/pages/Entidades'), 'Entidades');
const EntidadeDetalhe = pagina(() => import('@/pages/Entidades/EntidadeDetalhe'), 'EntidadeDetalhe');
const Fornecedores = pagina(() => import('@/pages/Fornecedores'), 'Fornecedores');
const Colaboradores = pagina(() => import('@/pages/Colaboradores'), 'Colaboradores');
const Contratos = pagina(() => import('@/pages/Contratos'), 'Contratos');
const Rateios = pagina(() => import('@/pages/Rateios'), 'Rateios');
const BensCedidos = pagina(() => import('@/pages/BensCedidos'), 'BensCedidos');
const ServidoresCedidos = pagina(() => import('@/pages/ServidoresCedidos'), 'ServidoresCedidos');
const ContasBancarias = pagina(() => import('@/pages/ContasBancarias'), 'ContasBancarias');
const Empresas = pagina(() => import('@/pages/Empresas'), 'Empresas');

const PrestacaoContas = pagina(() => import('@/pages/PrestacaoContas'), 'PrestacaoContas');
const PrestacaoDetalhe = pagina(() => import('@/pages/PrestacaoContas/PrestacaoDetalhe'), 'PrestacaoDetalhe');
const Espelho = pagina(() => import('@/pages/PrestacaoContas/Espelho'), 'Espelho');

const Despesas = pagina(() => import('@/pages/Despesas'), 'Despesas');
const ReceitasOrgao = pagina(() => import('@/pages/ReceitasOrgao'), 'ReceitasOrgao');
const PagamentosOrgao = pagina(() => import('@/pages/PagamentosOrgao'), 'PagamentosOrgao');
const GuiasRecolhimento = pagina(() => import('@/pages/GuiasRecolhimento'), 'GuiasRecolhimento');
const Conciliacao = pagina(() => import('@/pages/Conciliacao'), 'Conciliacao');

const Agenda = pagina(() => import('@/pages/Agenda'), 'Agenda');
const Fiscalizacao = pagina(() => import('@/pages/Fiscalizacao'), 'Fiscalizacao');
const Relatorios = pagina(() => import('@/pages/Relatorios'), 'Relatorios');
const Transparencia = pagina(() => import('@/pages/Transparencia'), 'Transparencia');
const TransparenciaRelatorio = pagina(() => import('@/pages/Transparencia/Relatorio'), 'TransparenciaRelatorio');

const Usuarios = pagina(() => import('@/pages/Usuarios'), 'Usuarios');
const Grupos = pagina(() => import('@/pages/Grupos'), 'Grupos');
const Orgaos = pagina(() => import('@/pages/Orgaos'), 'Orgaos');
const Auditoria = pagina(() => import('@/pages/Auditoria'), 'Auditoria');
const Privacidade = pagina(() => import('@/pages/Privacidade'), 'Privacidade');
const ProvisionarOrgao = pagina(() => import('@/pages/Suporte/ProvisionarOrgao'), 'ProvisionarOrgao');

/**
 * O que se vê enquanto o pedaço da tela chega.
 *
 * Discreto de propósito: a espera é de milissegundos numa conexão comum, e um
 * aviso grande piscando a cada navegação incomoda mais que a espera.
 */
function Carregando() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

export default function App() {
  return (
    // Um `Suspense` só, em volta de tudo: a fronteira é a troca de tela, e é a
    // mesma para todas as rotas. Um por rota daria 35 cópias do mesmo
    // componente de espera.
    //
    // O limite vai **por fora**: quem falha é o carregamento do pedaço, e o
    // erro sobe pelo `Suspense`. Por dentro, ele nunca seria alcançado.
    <LimiteDeCarga>
    <Suspense fallback={<Carregando />}>
    <Routes>
      {/* Rotas públicas (sem layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />

      {/* Rotas protegidas (exigem sessão) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          {/* Meu Perfil — sem `RequerPermissao`: editar o próprio cadastro não
              é administrar usuários. Fora do menu de propósito; entra-se por
              ele pelo nome na barra superior. */}
          <Route path="/perfil" element={<Perfil />} />

          {/* Cadastro */}
          <Route
            path="/cadastro/entidades"
            element={
              <RequerPermissao recurso="CADASTRO_ENTIDADES">
                <Entidades />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/entidades/:id"
            element={
              <RequerPermissao recurso="CADASTRO_ENTIDADES">
                <EntidadeDetalhe />
              </RequerPermissao>
            }
          />
          <Route
            path="/privacidade"
            element={
              <RequerPermissao recurso="CONFIG_PRIVACIDADE">
                <Privacidade />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/ajustes"
            element={
              <RequerPermissao recurso="CADASTRO_AJUSTES">
                <Ajustes />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/ajustes/:id"
            element={
              <RequerPermissao recurso="CADASTRO_AJUSTES">
                <AjusteDetalhe />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/fornecedores"
            element={
              <RequerPermissao recurso="CADASTRO_FORNECEDORES">
                <Fornecedores />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/contratos"
            element={
              <RequerPermissao recurso="CADASTRO_CONTRATOS">
                <Contratos />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/financeiro/rateio"
            element={
              <RequerPermissao recurso="CADASTRO_RATEIO">
                <Rateios />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/colaboradores"
            element={
              <RequerPermissao recurso="CADASTRO_COLABORADORES">
                <Colaboradores />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/bens-cedidos"
            element={
              <RequerPermissao recurso="CADASTRO_BENS_CEDIDOS">
                <BensCedidos />
              </RequerPermissao>
            }
          />
          <Route
            path="/cadastro/servidores-cedidos"
            element={
              <RequerPermissao recurso="CADASTRO_SERVIDORES_CEDIDOS">
                <ServidoresCedidos />
              </RequerPermissao>
            }
          />

          {/* Execução */}
          <Route
            path="/execucao/financeiro/contas-bancarias"
            element={
              <RequerPermissao recurso="EXECUCAO_CONTAS">
                <ContasBancarias />
              </RequerPermissao>
            }
          />
          <Route
            path="/execucao/financeiro/receitas"
            element={
              <RequerPermissao recurso="EXECUCAO_RECEITAS">
                <ReceitasOrgao />
              </RequerPermissao>
            }
          />
          <Route
            path="/execucao/financeiro/despesas"
            element={
              <RequerPermissao recurso="EXECUCAO_DESPESAS">
                <Despesas />
              </RequerPermissao>
            }
          />
          <Route
            path="/execucao/financeiro/pagamentos"
            element={
              <RequerPermissao recurso="EXECUCAO_PAGAMENTOS">
                <PagamentosOrgao />
              </RequerPermissao>
            }
          />
          <Route
            path="/execucao/financeiro/guias"
            element={
              <RequerPermissao recurso="EXECUCAO_GUIAS">
                <GuiasRecolhimento />
              </RequerPermissao>
            }
          />
          <Route
            path="/execucao/financeiro/conciliacao"
            element={
              <RequerPermissao recurso="EXECUCAO_CONCILIACAO">
                <Conciliacao />
              </RequerPermissao>
            }
          />
          <Route path="/execucao/tecnico" element={<Placeholder title="Técnico" />} />

          {/* Demais */}
          <Route
            path="/prestacao-contas"
            element={
              <RequerPermissao recurso="PRESTACAO_CONTAS">
                <PrestacaoContas />
              </RequerPermissao>
            }
          />
          <Route
            path="/prestacao-contas/:id"
            element={
              <RequerPermissao recurso="PRESTACAO_CONTAS">
                <PrestacaoDetalhe />
              </RequerPermissao>
            }
          />
          <Route
            path="/prestacao-contas/:id/espelho"
            element={
              <RequerPermissao recurso="PRESTACAO_CONTAS">
                <Espelho />
              </RequerPermissao>
            }
          />
          <Route
            path="/relatorios"
            element={
              <RequerPermissao recurso="RELATORIOS">
                <Relatorios />
              </RequerPermissao>
            }
          />
          <Route
            path="/agenda"
            element={
              <RequerPermissao recurso="AGENDA">
                <Agenda />
              </RequerPermissao>
            }
          />
          <Route
            path="/fiscalizacao"
            element={
              <RequerPermissao recurso="FISCALIZACAO">
                <Fiscalizacao />
              </RequerPermissao>
            }
          />
          <Route
            path="/transparencia"
            element={
              <RequerPermissao recurso="TRANSPARENCIA">
                <Transparencia />
              </RequerPermissao>
            }
          />
          <Route
            path="/transparencia/relatorio"
            element={
              <RequerPermissao recurso="TRANSPARENCIA">
                <TransparenciaRelatorio />
              </RequerPermissao>
            }
          />

          {/* Configurações */}
          <Route
            path="/empresas"
            element={
              <RequerPermissao recurso="CADASTRO_EMPRESAS">
                <Empresas />
              </RequerPermissao>
            }
          />
          <Route
            path="/orgaos"
            element={
              <RequerPermissao recurso="CONFIG_ORGAOS">
                <Orgaos />
              </RequerPermissao>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RequerPermissao recurso="CONFIG_USUARIOS">
                <Usuarios />
              </RequerPermissao>
            }
          />
          <Route
            path="/grupos"
            element={
              <RequerPermissao recurso="CONFIG_GRUPOS">
                <Grupos />
              </RequerPermissao>
            }
          />
          <Route
            path="/auditoria"
            element={
              <RequerGrupo grupos={GRUPOS_ADMIN}>
                <RequerPermissao recurso="CONFIG_AUDITORIA">
                  <Auditoria />
                </RequerPermissao>
              </RequerGrupo>
            }
          />

          {/* Suporte — a própria tela confere a marca; o servidor responde 404
              a quem não a tem, então não há recurso de permissão a exigir. */}
          <Route path="/suporte/provisionar" element={<ProvisionarOrgao />} />

          <Route path="*" element={<Placeholder title="Página não encontrada" />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
    </LimiteDeCarga>
  );
}
