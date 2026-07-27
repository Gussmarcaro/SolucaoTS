# Plano de Ação — Solução TS

Roadmap de implementação do SaaS de prestação de contas ao Terceiro Setor (Audesp Fase V / TCESP). Complementa [CLAUDE.md](CLAUDE.md), [REGRAS_DESENVOLVIMENTO.md](REGRAS_DESENVOLVIMENTO.md) e [Documentação/REGRAS_NEGOCIO_FASE_V.md](Documentação/REGRAS_NEGOCIO_FASE_V.md).

## Princípios de sequenciamento
- **Domínio primeiro:** o valor do produto está no Cadastro de Ajuste + Prestação de Contas. Segurança/infra são pré-requisito, não o foco.
- **Vertical slices:** cada fase entrega algo executável e testável ponta a ponta, não uma camada isolada.
- **Frontend em paralelo:** pode começar a partir da Fase 1, consumindo os endpoints à medida que surgem.
- **Norma antes do código:** todo bloco/validação passa pelo `auditor-fase-v` antes de implementar.

## MVP (meta de primeira entrega)
Um órgão consegue: autenticar → cadastrar um Ajuste (com import de CSV) → montar uma Prestação de Contas → validar localmente → transmitir ao ambiente **piloto** do TCESP e consultar o status. Isso cobre as Fases 0–4 para **um** tipo de ajuste (sugestão: **Convênio**), expandindo aos demais depois.

---

## Fase 0 — Fundação e setup
**Objetivo:** repositório executável com a base técnica pronta.
- Monorepo `backend/` + `frontend/`; Git inicializado (`.gitignore`).
- Backend: `package.json`, TypeScript, Express, ESLint + Prettier, estrutura de pastas Clean Architecture (`core/application/infrastructure/presentation/shared`).
- Prisma: instalar, `prisma validate`/`format` no schema atual, `docker-compose.yml` com PostgreSQL, `.env.example` (`DATABASE_URL`), primeira migration.
- Healthcheck HTTP + middleware central de erros (`BusinessError`).

**Agentes:** domain-modeler (validar schema), clean-arch-reviewer.
**Concluído quando:** `prisma migrate dev` roda limpo e o servidor sobe com `/health`.

## Fase 1 — Segurança, multi-tenant e seed de órgãos
**Objetivo:** autenticação e isolamento por órgão funcionando.
- Auth (JWT) — login/refresh; hash de senha.
- CRUD de `Cliente`, `Usuario`; RBAC (`GrupoUsuario`/`Permissao`) com `modulo`+`acao`.
- **Middleware de tenant** (filtro por `clienteId` garantido no repositório) + middleware de autorização.
- **Seed dos ~2.900 órgãos** a partir de `Documentação/Fase_V_entidades.pdf` (município, tipo, periodicidade).

**Agentes:** clean-arch-reviewer (isolamento multi-tenant), domain-modeler (ajustes de schema/seed).
**Concluído quando:** usuário loga, só enxerga dados do próprio `Cliente`, e permissões bloqueiam ações não autorizadas.

## Fase 2 — Cadastro de Ajuste (núcleo do domínio)
**Objetivo:** registrar um Ajuste completo, incluindo importações.
- `EntidadeBeneficiaria`, `Certidao`, `Ajuste` (com `tipoAjuste`), `TermoAditivo`.
- Plano de Trabalho: `Programa`/`Meta`, `PlanoAplicacaoItem`, `CronogramaDesembolsoItem`, `BemCedidoCadastro`, `EmpenhoCadastro`.
- **Parsers de CSV** (Plano de Aplicação, Cronograma, Bens Cedidos) com fixtures reais.
- Use cases + ports/repos Prisma + controllers; máquina de status `EM_ELABORACAO → ENVIADO`.

**Agentes:** csv-parser-dev, auditor-fase-v (regras de cadastro), domain-modeler, clean-arch-reviewer.
**Concluído quando:** um Ajuste (Convênio) é cadastrado e um CSV é importado e persistido corretamente, com testes.

## Fase 3 — Prestação de Contas: blocos e montagem do JSON
**Objetivo:** montar o documento da prestação com as regras espelhadas no core.
- `PrestacaoContas` + blocos filhos (empregados, bens, contratos, documentos fiscais, pagamentos, disponibilidades, receitas, servidores cedidos, descontos, devoluções, glosas, empenhos, repasses, relatório de atividades).
- **Validações de negócio no `core`** (unicidade composta, campos condicionais, datas, valores, CPF/CNPJ, referências cruzadas) — falhar cedo.
- Montagem do JSON + **validação contra o JSON Schema** local; respeitar aplicabilidade por tipo de ajuste.

**Agentes:** auditor-fase-v (por bloco), domain-modeler, clean-arch-reviewer.
**Concluído quando:** uma Prestação de Convênio é montada, passa nas validações locais e gera um JSON válido pelo schema.

## Fase 4 — Integração com a API do TCESP
**Objetivo:** transmitir e acompanhar a prestação (ambiente piloto).
- Adapter: `POST /login` → token; envio multipart no path do tipo; `GET /f5/consulta`.
- Persistir `protocolo`, mapear status (`Armazenado`/`Rejeitado`/`Substituído`/`Excluído`), guardar `inconformidades`.
- Fluxos de **retificação** (reenvio completo) e **declaração negativa**.
- Resiliência: timeouts, retry seguro, checagem de status antes de reenviar. Credenciais/URLs por env.

**Agentes:** tcesp-api-integrator, auditor-fase-v (retificação/negativa), clean-arch-reviewer.
**Concluído quando:** uma prestação é transmitida ao piloto e o status é consultado e refletido no sistema. **← fecha o MVP.**

## Fase 5 — Workflow e prazos legais
**Objetivo:** controlar obrigações e prazos.
- `Projeto`/`Tarefa`; **geração automática de tarefas de prazo** a partir da `periodicidade` do Cliente (Quadrimestral = 5 dias úteis; Anual = 15 dias úteis).
- Painel/alertas de prazos a vencer; vínculo tarefa ↔ ajuste/prestação.

**Agentes:** domain-modeler, auditor-fase-v (prazos), clean-arch-reviewer.
**Concluído quando:** ao cadastrar um ajuste, as tarefas de prazo são criadas conforme a periodicidade.

## Fase 6 — Frontend (em paralelo desde a Fase 1)
**Objetivo:** UI completa do fluxo.
- Layout + tema claro/escuro (`useTheme`), Auth UI, guardas de rota por permissão.
- Telas: login, lista/form de Ajustes, importação de CSV, montagem/consulta de Prestação, dashboard de prazos.
- Máscaras (CNPJ, moeda, processo) em `utils/`; API isolada em `services/`.

**Agentes:** frontend-builder.
**Concluído quando:** o fluxo do MVP é operável pela interface.

## Fase 7 — Hardening e entrega
**Objetivo:** prontidão para produção.
- Testes e2e do fluxo crítico; cobertura das validações de domínio.
- Observabilidade (logs estruturados, tratamento de erros), auditoria de ações.
- Pipeline de deploy; migração do ambiente piloto → produção do TCESP; expansão para os 5 tipos de ajuste.

**Agentes:** clean-arch-reviewer, auditor-fase-v (cobertura por tipo de ajuste), test-runner (a criar).

---

## Dependências (resumo)
```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ─(MVP)─► Fase 5 ──► Fase 7
                              └────────────► Fase 6 (paralela) ──────────┘
```

## Decisões
- ✅ **Tipo de ajuste do MVP: Convênio** (decidido em 24/07/2026). As Fases 2–4 são construídas primeiro para Convênio; os demais 4 tipos entram na Fase 7.
- ⏸️ **Execução:** por ora apenas documentação/planejamento — nenhum código até nova instrução.

### Pendentes (definir antes/junto da Fase 0)
- **Autenticação:** JWT próprio? MFA para servidores públicos?
- **Tabelas-lookup** dos domínios oficiais (fontes de recurso, categorias de despesa, CBO, classificação econômica): criar como FK na Fase 2/3 (recomendado) ou manter como código.
- Estratégia multi-tenant: schema único com `clienteId` (assumido) vs. schema por órgão.
