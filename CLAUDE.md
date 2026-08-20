# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

**Solução TS** é um SaaS multi-tenant para órgãos públicos de SP (Prefeituras, Câmaras, Autarquias, Fundações, Consórcios) prestarem contas de repasses ao **Terceiro Setor** exigidas pelo **TCESP — Audesp Fase V**. Além de montar/transmitir os artefatos ao Tribunal, tem um módulo de Workflow para controlar prazos legais.

O idioma do domínio e do código é **português** (nomes de entidades, campos e enums seguem a nomenclatura do TCESP).

## Estado atual do repositório

Backend e frontend **existem e rodam** (deploy: API no Render, front na Vercel). Já entregues: os cadastros (grid+form+CRUD), o dossiê do Ajuste com as 3 importações de CSV, e a **Prestação de Contas completa** — todos os blocos do manual v1.19, montador do `documentoJSON`, validações espelhadas no core e o adapter de transmissão ao Audesp (estruturado, **ainda não testado contra o piloto real**).

- `Documentação/` — manuais oficiais do TCESP, tabelas de domínio, arquivos de exemplo (CSV/JSON) e a síntese de regras.
- `backend/` — Express + Prisma em Clean Architecture · `frontend/` — React + Vite + Tailwind.

O cadastro de **Empresas** está **suspenso** (11/08/2026): saiu do menu em `navigation.ts`, mas a rota `/empresas`, a página e a API continuam registradas para o retorno custar uma linha. **Alterações em lote nos cadastros** (padrão de grade, máscaras, rótulos, validações comuns) **devem pular Empresas.**

O **usuário do sistema é sempre pessoa física**: `Usuario.documento` é CPF, sem `documentoTipo`. Fornecedor, Contrato e DocumentoFiscal continuam aceitando PF ou PJ — é lá que vive o enum `TipoDocumento`.

Checagem automatizada em duas camadas: os scripts **`verificar:*`** (regras puras, sem banco) e **`npm test`** (integração com Postgres, hoje cobrindo o isolamento multi-tenant). Ver "Comandos". Antes de assumir que um comando existe, confira o `package.json` correspondente.

## Leitura obrigatória antes de codar o domínio

- **`REGRAS_DESENVOLVIMENTO.md`** — convenções e padrões obrigatórios de código (arquitetura, Prisma, validações, parsers, multi-tenant, testes). Siga-o em todo o código.
- **`Documentação/REGRAS_NEGOCIO_FASE_V.md`** — síntese das regras de negócio da Fase V (fluxo, API REST do TCESP, prazos, os ~30 blocos da prestação de contas com a regra-chave de cada um, validações transversais). É a referência canônica; **consulte antes** de implementar qualquer validação ou bloco.
- `Documentação/Prompt Finalizado.docx` — documento de arquitetura original (visão de stack e camadas). **Atenção:** seu modelo de dados é simplificado demais (só `Convenio`/`Empenho`) e foi superado pelo `schema.prisma`.
- `Documentação/empenho_schema.json` — JSON Schema de um bloco (empenho). Lembrar que a prestação de contas real tem muitos outros blocos.
- Arquivos `*.csv` de exemplo — formatos de importação (ver "Parsers de CSV" abaixo).

## Arquitetura

**Clean Architecture + Hexagonal (Ports & Adapters).** Motivo: as normativas do TCESP mudam por comunicado com frequência, então o núcleo (Domínio + Casos de Uso) fica **agnóstico** a framework/DB/UI, e integrações (API do TCE, leitura de CSV) entram como Adapters plugáveis.

Stack alvo:
- **Backend:** Node.js + Express + TypeScript, ORM **Prisma**, **PostgreSQL**.
  Camadas: `core/` (entidades: audesp, workflow) → `application/` (use cases, DTOs, ports/interfaces) → `infrastructure/` (implementações de DB, parsers, provedores externos) → `presentation/` (controllers, rotas, middlewares) → `shared/`.
- **Frontend:** React + Tailwind + TypeScript, Axios. Tema claro/escuro via `useTheme` (Context + localStorage + classe `dark` do Tailwind).

Regra de dependência: `presentation` e `infrastructure` dependem de `application`/`core`; **nunca** o inverso. Repositórios são definidos como interfaces (ports) em `application` e implementados com Prisma em `infrastructure`.

## Modelo de domínio (o "big picture")

Definido em `backend/prisma/schema.prisma`. Dois módulos Audesp em sequência + segurança + workflow:

1. **Cadastro de Ajuste** — `Ajuste` é a entidade **central** (não `Convenio`), com `tipoAjuste` entre 5 valores (Contrato de Gestão, Convênio, Termo de Colaboração, Termo de Fomento, Termo de Parceria). Agrega `TermoAditivo`, `Certidao`, `EntidadeBeneficiaria`, `Programa`/`Meta`, `PlanoAplicacaoItem`, `CronogramaDesembolsoItem`, `BemCedidoCadastro`, `EmpenhoCadastro`.
2. **Prestação de Contas** — `PrestacaoContas` (filha de `Ajuste`) é a raiz de ~15 blocos filhos (empregados, bens, contratos, documentos fiscais, pagamentos, disponibilidades, receitas, servidores cedidos, descontos, devoluções, glosas, empenhos, repasses, relatório de atividades). **Este módulo não tem tela no TCESP: é transmitido só via API REST** montando um documento JSON.
3. **Segurança** — `Cliente` (órgão) → `Usuario`; RBAC via `GrupoUsuario` / `Permissao` (`modulo` + `acao`).
4. **Workflow** — `Compromisso` (agenda: evento com data/hora e registro do que foi tratado) e `Tarefa` (`prazoLegal`, `prioridade`, `status`), ligada opcionalmente a um `Ajuste` e ao alerta do sino que a originou (`origemAlerta`). `Projeto` existe no schema e ainda não é usado — ver "Fiscalização | Monitoramento".

Convenções do schema: PKs `uuid`, dinheiro `Decimal(15,2)`, datas `@db.Date`. As **regras de unicidade dos manuais viraram `@@unique` compostos** (ex.: documento fiscal único por `numero+credor`, empenho por `numero+dataEmissao`, empregado por `cpf+dataAdmissao`) — preserve-as ao evoluir o schema.

## Integração com a API do TCESP (Prestação de Contas)

Adapter na camada `infrastructure`. Fluxo: `POST /login` (header `x-authorization: usuario:senha`) → token Bearer → envio multipart no path do tipo de ajuste (campo `documentoJSON`) → retorna protocolo → `GET /f5/consulta` para o status. Estados: `Armazenado` (aceito), `Rejeitado` (com inconformidades), `Substituído`, `Excluído`.
- Produção: `https://audesp.tce.sp.gov.br` · Piloto: `https://audesp-piloto.tce.sp.gov.br` (ambientes **não** se comunicam).
- Validação em duas camadas: **JSON Schema** no envio + **regras de negócio** após recepção. Espelhe as regras de negócio no `core` para falhar cedo, antes de transmitir.

## Parsers de CSV

Três importações (`PlanoAplicacaoItem`, `CronogramaDesembolsoItem`, `BemCedidoCadastro`) leem CSVs cujos exemplos estão em `Documentação/`. Os parsers (em `infrastructure/parsers`) **precisam** tratar:
- separador `;` e encoding **Latin-1/Windows-1252** (converter para UTF-8, senão acentos das rubricas quebram);
- mês por **nome** ou **número** (normalizar para 1–12);
- valores em **padrão brasileiro** (`1.522.632,45`);
- **linhas duplicadas** (deduplicar/somar conforme o bloco).

## Tabelas de domínio oficiais

Códigos publicados pelo TCESP/MTE, carregados no banco por seed e **somente lidos** pela aplicação. Inventar código causa rejeição no envio, então os formulários selecionam da tabela em vez de aceitar digitação livre (`BuscaCbo` / `BuscaClassificacao` no front, rotas `/dominios` no back).

| Tabela | Model | Fonte em `Documentação/` |
|---|---|---|
| CBO 2002 (campo `cbo`) | `Cbo` | `cbo2002-ocupacao.csv` |
| Classificação econômica da despesa (campo `classificacao_economica_tipo`) | `ClassificacaoEconomica` | `TABELA-NATUREZA-DA-DESPESA-<ano>.xlsx`, aba `ND <ano>` |
| Categoria econômica / grupo / modalidade / elemento | `ComponenteDespesa` | mesmas abas auxiliares do xlsx |

Fluxo: `npm run dominios:gerar` lê as publicações originais e escreve NDJSON **versionado** em `backend/prisma/seeds/data/`; `npm run dominios:seed` (ou o startup da API, se as tabelas estiverem vazias) carrega no banco. O leitor de .xlsx é próprio (`infrastructure/parsers/xlsx.ts`, ZIP via `zlib.inflateRaw`) — sem dependência externa.

A classificação econômica vale **por exercício e por esfera do ente** (E/M/C): o exercício do empenho é o ano da **emissão**, não o da prestação (§17 #2). `MontarPrestacaoUseCase` confronta CBO e classificação com as tabelas e transforma código inexistente em **erro bloqueante** antes de transmitir.

### JSON Schema oficial (v1.14) — fonte canônica

`backend/src/infrastructure/tcesp/schemas/` guarda os schemas oficiais do Audesp (os 5 tipos de ajuste + Declaração Negativa), publicados em *"AUDESP - Repasses ao Terceiro Setor - JSON/Schemas"*. Eles são a **validação estrutural que o TCESP aplica no envio** — documento fora do schema é rejeitado antes das regras de negócio. Duas consequências:

1. **As tabelas de domínio são geradas deles.** `npm run dominios:fase-v` lê os schemas e reescreve `frontend/src/lib/dominiosFaseV.ts` (códigos + rótulos, dos `examples`) e `backend/src/core/dominio/tabelasFaseV.ts` (só os códigos). **Os dois são gerados — não edite à mão.** Cobre `categoria_despesas_tipo` (88), `fonte_recurso_tipo` (16), `banco` (400), `estado_emissor`, `natureza_contratacao`, `criterio_selecao`, `onus_pagamento`, `conta_tipo`, `valor_tipo`, `vigencia_tipo`, `tipo_documento_bancario`. Código fora delas é **erro bloqueante** (`validarDominios.ts`).
2. **O documento montado é validado localmente** por `AjvValidadorSchema` antes de transmitir, com o caminho exato do campo. Cuidados do adapter: os schemas declaram `$schema` como `https://…/draft-07/schema` (sem `#`), que o Ajv não resolve — registramos o meta-schema sob esse `$id`; e é preciso `multipleOfPrecision: 2`, senão `multipleOf: 0.01` reprova valores como `4.56` por ponto flutuante. Falha ao compilar **não** bloqueia o envio, mas vira aviso explícito — validação que não roda não pode passar por documento válido.

3. **`npm run verificar:montador` é a rede de proteção.** Monta um `DadosMontagem` sintético com todos os blocos preenchidos, roda o montador e valida com o Ajv nos 5 tipos de ajuste; depois quebra o documento de 15 formas diferentes e confere que cada regra de negócio barra. Não precisa de banco. **Rode sempre que mexer no montador ou em `validarPrestacao`** — foi ele que revelou `saldo_fundo_fixo` e `empresas_pertencentes` faltando.

Ao atualizar de versão: substitua os `.json`, ajuste `VERSAO_SCHEMA` em `schemas/index.ts`, rode `npm run dominios:fase-v`, o `verificar:montador` e o typecheck dos dois projetos.

**Campos obrigatórios fáceis de esquecer** (o `limpo()` do montador remove nulos, então um campo não preenchido some do JSON e vira rejeição): `disponibilidades.saldo_fundo_fixo`; em `repasses`, o `tipo_documento_bancario`, `numero_documento`, `banco`, `agencia` e `conta`; em `declaracoes.empresas_pertencentes`, **os dois** campos (CNPJ da empresa **e** CPF do dirigente). Identificações de certidão têm formato fixo `^[0-9]{10}$`.

### XSDs das Tabelas Auxiliares (Fase I/II/III) — quase nada serve aqui

`Documentação/Tabelas Auxiliares/` traz XSDs do Audesp **contábil/orçamentário**, não da Fase V. Praticamente tudo ali está fora do nosso escopo (classificação de receita, plano de contas detalhado, funções e subfunções de governo, tipos de licitação/convênio). Duas observações que importam:

- **`ClassificacaoDespesaExecutiva_t`** (XSD 2024) é a **classificação econômica do exercício 2024** — 1.458 códigos de 8 dígitos com os nomes nos comentários. Hoje só carregamos **2025**. Vale carregar quando surgir a necessidade: a §17 #2 permite empenho emitido antes do período na *primeira* prestação do ajuste, então a prestação de 2025 pode conter empenho de 2024. A tabela já é por exercício (PK `exercicio+codigo`), então é só estender o gerador e o seed — sem mudança de schema. Enquanto isso, `codigosInexistentes` não valida exercício não carregado, o que evita bloqueio indevido.
- **`CodigoFonteRecursos_t` tem 17 valores, incluindo `19 = RECURSOS EXTRA-ORÇAMENTÁRIOS`. NÃO adicione o 19** à tabela da Fase V: ele não existe no schema v1.14 e seria rejeitado. Os outros 16 batem exatamente com os nossos.

Esse cruzamento também confirmou que a extração da ND 2025 está fiel: 1717 linhas na planilha, 1709 carregadas, e as 8 de diferença são exatamente as marcadas como EXCLUSÃO.

Armadilhas já verificadas: a spec em PDF (v1.1) está **defasada** — `categoria_despesas_tipo` foi renumerada por inteiro entre a v1.1 e a v1.14, então código capturado por aquela lista está errado. A planilha da STN ("Fonte ou Destinação de Recursos") é a tabela **nacional** e não corresponde ao `fonte_recurso_tipo` do TCESP. E o PDF erra ao dizer "3 – Outros" em `tipo_documento_bancario`: o schema define `2 = Outros` e `3 = Cheque`.

## Log estruturado (`shared/log.ts`)

Uma linha JSON por requisição, no stdout — que toda hospedagem já captura, sem nada a instalar ou manter no ar.

```json
{"t":"…","nivel":"erro","evento":"requisicao","req":"a3f9","metodo":"POST",
 "rota":"/api/prestacoes/:id/transmitir","status":500,"ms":1840,"usuario":"…","orgao":"…"}
```

- **`orgao` é o campo que justifica tudo isso.** Num sistema multi-tenant, é a diferença entre saber que algo falhou e saber *para quem* falhou. A linha sai no `finish` da resposta justamente porque o órgão só existe depois de o `autenticar` ler o token.
- **Não é a trilha de auditoria.** A auditoria responde "quem alterou este fornecedor" para o órgão e o Tribunal, e guarda para sempre; isto responde "por que a requisição das 14h32 falhou" para quem opera, e pode ser descartado em semanas. A auditoria **não** registra requisição que falhou — se a gravação estourou não há alteração a registrar, e é justo esse o caso a investigar.
- **`AppError` não vira linha de erro.** Senha errada e dado inválido são uso normal; a linha da requisição já marca o 4xx como `aviso`. Só o inesperado (5xx) gera `erro-inesperado`, com o stack recortado em 6 linhas.
- **O id da requisição volta ao usuário** no corpo do 500 e aparece na mensagem da tela (`código a3f9`). É o que troca "consegue reproduzir?" por uma busca de um segundo.
- **Nada de corpo de requisição no log**, e `ocultarSensiveis` apaga senha, token, CPF/CNPJ em qualquer profundidade. Log é lugar clássico de vazamento de dado pessoal.
- Identificador em caminho de URL vira `:id` (e número longo, `:n`) — sem isso cada requisição seria uma "rota" distinta e não haveria o que agrupar. A query string fica de fora, que é onde o usuário digita nome e CPF na busca.
- `/health` não é registrado: o ping de minuto em minuto enterraria o resto.
- Coberto por `npm test` (`tests/log.test.ts`), que **roda sem banco**.

### Agregação de erros (`shared/monitoramento.ts`)

Sentry, **ligado só quando `SENTRY_DSN` existe** — sem a variável nada é iniciado e nada sai, como o assistente sem `ANTHROPIC_API_KEY`.

O log responde *"o que houve nesta requisição"*. Isto responde *"este erro é novo ou já acontece há semanas?"* e *"quantos órgãos ele atinge?"*, e avisa antes do telefonema.

- **Por que serviço externo e não uma tabela nossa:** o erro que mais importa investigar é o que acontece **quando o banco está com problema** — e aí uma tabela não registra nada.
- **Tudo que carrega dado pessoal está desligado explicitamente**, porque os padrões do SDK são permissivos: ele mandaria cookies, cabeçalhos (inclusive o `Authorization`), corpo das requisições, query string e parâmetros de SQL. Cada linha de `dataCollection` é uma decisão, não cópia de exemplo. `beforeSend` (`limparEvento`) é o cinto e suspensório: se uma atualização do SDK mudar um padrão, não vira vazamento silencioso.
- **`AppError` não é reportado.** Senha errada e dado inválido são uso normal; no painel virariam ruído até o alerta ser ignorado.
- **O órgão vai como _tag_**, não no corpo: tag é o que o painel agrupa e filtra. É a diferença entre "500 erros" e "500 erros, todos da Prefeitura X" — que costuma ser a resposta inteira.
- `tracesSampleRate: 0`: o que se quer é erro; traço de transação carregaria consulta e parâmetro para fora sem necessidade.
- O `server.ts` também registra `uncaughtException` e `unhandledRejection` — sem isso, "a API reiniciou sozinha às 3h" não deixa rastro nenhum.
- Coberto por `tests/monitoramento.test.ts`, **sem rede e sem banco**: exercita quem decide *se* o erro sai e *o que* vai junto.

## Limites de taxa (`middlewares/limites.ts`)

`/auth/*` é a única família que responde **antes** da autenticação — a única porta que um estranho consegue empurrar. Três limites, por IP:

| Rota | Limite | Conta o quê |
|---|---|---|
| `/auth/login` | 10 / 15 min | **só as falhas** (`skipSuccessfulRequests`) |
| `/auth/esqueci-senha`, `/auth/redefinir-senha` | 5 / hora | tudo, inclusive sucesso |
| API inteira | 300 / min | tudo, menos `/health` |

- **Por IP, nunca por e-mail.** Limitar por conta deixaria qualquer um trancar a conta de qualquer outro só errando a senha dele — trocaria força bruta por negação de serviço dirigida.
- **Sucesso no login não consome cota.** Sem isso, um escritório inteiro atrás do mesmo IP se tranca no meio do expediente. Na recuperação é o contrário, e de propósito: é o pedido *bem-sucedido* que dispara e-mail na caixa de outra pessoa.
- O teto geral não é contra ataque, é contra o laço acidental — um `useEffect` mal escrito disparando mil requisições por minuto derruba o banco de todos os órgãos.
- **`app.set('trust proxy', 1)`** é obrigatório em produção e vem antes dos limites: atrás do proxy da hospedagem, sem isso o `req.ip` de todo mundo é o mesmo e as dez primeiras senhas erradas do sistema trancam todos os órgãos. É **um salto**, não `true` — confiar em todos deixaria forjar o `X-Forwarded-For` e escapar do limite. Ajustável por `TRUST_PROXY`.
- Coberto por `npm test` (`tests/limites.test.ts`), que **roda sem banco**.

## Autenticação e auditoria

**Toda rota exige JWT**, exceto `/health` e `/auth/*`. O middleware `autenticar` valida o Bearer, popula `req.usuario` e abre um **`AsyncLocalStorage`** (`shared/contexto.ts`) com usuário e rota. É esse contexto que permite à camada de dados saber *quem* está operando sem que use cases e repositórios recebam o usuário como parâmetro — a regra de dependência continua intacta.

A trilha é gravada por uma **extension do Prisma Client** (`extensaoAuditoria.ts`), não por chamadas espalhadas pelos use cases: assim vale para qualquer caminho que grave, inclusive código novo.

- **Inclusão não gera log**, em nenhum model. A autoria fica no campo `criadoPor` do próprio registro, preenchido pela extension — é onde ela é consultada na prática. Todas as **40 grades de registros** têm o campo; blocos 1:1 da prestação e ligações do RBAC ficam de fora. A lista de models com o campo é **derivada do schema**, não escrita à mão, então um cadastro novo é reconhecido sozinho. `CRIACAO` segue no enum e nos filtros por causa das linhas gravadas antes dessa mudança.
- `ALTERACAO` guarda **só o diff** (`{ campo: { de, para } }`); `EXCLUSAO` guarda o registro inteiro (última chance de saber o que havia). Soft delete (`definirAtivo`) vira `INATIVACAO`/`REATIVACAO`.
- Operações em lote (a reimportação de CSV apaga e recria tudo) viram **uma** linha com a quantidade, não centenas.
- **Nunca logar** `senhaHash`, `resetTokenHash`, `resetTokenExpiresAt`; `buscaTexto` e `atualizadoEm` também ficam de fora, por serem derivados que mudam a cada gravação e só poluiriam o diff.
- Fora da trilha: tabelas de domínio (`Cbo`, `ClassificacaoEconomica`, `ComponenteDespesa`) e a própria `RegistroAuditoria` — que é **append-only** e se auditar-se-ia em laço infinito.
- **A trilha é recortada por órgão** (`RegistroAuditoria.clienteId`). Sem essa coluna ela seria a única listagem do sistema a atravessar o isolamento: não tem pai de onde herdar o órgão, e um Administrador enxergaria quem alterou o quê nos outros órgãos, com `registroDescricao` (razão social, nome) e o diff inteiro junto. O campo é preenchido **explicitamente** em `registrar()`, porque essa gravação usa o client sem extensions (para não se auditar em laço) e o carimbo automático não roda ali.
- Falha ao gravar a trilha **não derruba** a operação de negócio; vai para o log do servidor.

A trilha guarda também uma **descrição legível** do registro (`registroDescricao`) — razão social, nome ou número, capturada na hora do evento, porque depois de uma exclusão não há mais onde lê-la. Sem ela o log diria "alteraram um Fornecedor" sem dizer qual.

`npm run verificar:auditoria` confere as regras puras (diff, omissão de campos sensíveis e a descrição) sem precisar de banco.

### Restrição por grupo

A auditoria é restrita aos grupos **Administrador** e **Suporte** (`GRUPOS_ADMIN`). São três camadas, e as três importam:

1. `exigirGrupo('Administrador', 'Suporte')` na rota do backend — **a única que protege de fato**;
2. `filtrarPorGrupo` no `NavMenu`, que some com o item;
3. `<RequerGrupo>` no router, para a URL digitada à mão não abrir a tela.

O grupo vem no **token JWT** (`payload.grupo`), preenchido no login a partir de `Usuario.grupoUsuarioId → GrupoUsuario.nome`. Duas consequências operacionais:

- **Tokens antigos não têm o grupo.** Quem já estava logado precisa sair e entrar de novo, senão recebe 403.
- Os grupos são **cadastro livre** (`GrupoUsuario.nome`), não enum, e nenhum seed os cria. Se não existir um grupo "Administrador" ou "Suporte" com usuários vinculados, **ninguém** vê a auditoria. A comparação ignora acento e caixa.

## Prazos legais (regra que dirige o Workflow)

A Fase V tem **4 prazos distintos** que o Workflow deve controlar:
1. **Cadastro do Ajuste** — 10 dias úteis após a assinatura (interação direta/tela).
2. **Cadastro do Termo Aditivo** — 10 dias úteis após a assinatura (interação direta/tela).
3. **Declaração Negativa** — por **periodicidade do órgão** (fonte: `Fase_V_entidades`): **Quadrimestral** (Prefeituras/Autarquias/Fundações Típicas; UGEs estaduais) = 5 dias úteis após o quadrimestre; **Anual** (demais, ex. Câmaras) = 15 dias úteis após o ano.
4. **Prestação de Contas** — **anual e consolidada** (Manual v1.18 = "prestação anual"; descritor `mes = 12`), até **30/06 do exercício subsequente** ao repasse (repasse 2025 → até 30/06/2026). Piloto = 2025; obrigatório a partir de 01/jan/2026.

Ou seja, a periodicidade Quadrimestral/Anual do `Fase_V_entidades` dirige o prazo da **Declaração Negativa**; a **Prestação de Contas** é sempre anual (30/06). Detalhes em `Documentação/REGRAS_NEGOCIO_FASE_V.md` (§5).

## Comandos (após a inicialização do backend)

No `backend/`:
- `npm run dev` / `npm start` — sobe a API (`/api`, healthcheck em `/api/health`).
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — testes de integração (precisa de `DATABASE_URL_TEST`; sem ela, pula).
- `npx prisma format` / `npx prisma generate` — formatar o schema / gerar o client tipado.
- `npm run db:push` — aplicar o schema no banco (é o que o Render roda no deploy).
- `npm run dominios:gerar` / `npm run dominios:seed` — regerar e carregar CBO e classificação econômica (tabelas grandes, no banco).
- `npm run dominios:fase-v` — regerar as tabelas de domínio do JSON Schema (front + back).
- `npm run verificar:montador` — conferir o montador contra o schema e as regras de negócio (sem banco).
- `npm run verificar:auditoria` — conferir as regras da trilha de auditoria (sem banco).
- `npm run verificar:workflow` — conferir as regras das tarefas de acompanhamento (sem banco).
- `npm run verificar:agenda` — conferir visibilidade, recorrência e validação da agenda (sem banco).
- `npm run verificar:tenant` — conferir o isolamento multi-tenant (sem banco).
- `npm run tenant:backfill` — atribuir um órgão aos registros anteriores ao multi-tenant (roda **uma vez**).
- `npm run suporte:conceder -- <email>` / `suporte:revogar` / `suporte:listar` — marca da equipe do fornecedor.
- `npm run bootstrap -- --orgao … --cnpj … --email … --senha …` — **banco vazio**: cria o primeiro órgão, o grupo e o primeiro usuário (com marca de suporte). Recusa rodar se já houver usuário.

No `frontend/`: `npm run dev` (Vite em :5173) e `npm run build`.

**A CI roda tudo isso a cada push e pull request** (`.github/workflows/ci.yml`): typecheck dos dois projetos, os sete `verificar:*`, o `npm test` e o build do frontend. O job do backend sobe um **Postgres de serviço** e aponta `DATABASE_URL_TEST` para ele — é lá que os testes de isolamento multi-tenant efetivamente rodam, já que a máquina de desenvolvimento pode não ter banco.

Duas camadas de checagem automatizada:

- **`verificar:*`** (montador, auditoria, alertas, permissões, assistente, workflow, tenant) — regras puras, **sem banco**. Rodam em qualquer lugar e são a rede do dia a dia.
- **`npm test`** (vitest + supertest) — integração de verdade, **com Postgres**. Hoje cobre o isolamento multi-tenant de ponta a ponta: dois órgãos provisionados, e cada cenário provando que um **não** alcança o outro (listagem, busca por id, alteração, busca global, contagem, usuários, `/orgaos`).

  Sem `DATABASE_URL_TEST` a suíte **pula** em vez de falhar — quem clonou para mexer no frontend não deve ver vermelho por não ter Postgres. Para rodar de fato:

  ```
  DATABASE_URL_TEST="postgresql://…/solucaots_test" npm test
  ```

  O banco apontado é **truncado** a cada rodada; a variável é separada de `DATABASE_URL` exatamente para isso.

  É a única camada que prova a ligação inteira — claim `cli` → `AsyncLocalStorage` → as duas extensions na ordem certa → o SQL com o recorte. Qualquer elo pode se soltar num refactor sem nada quebrar visivelmente: o sistema continua funcionando, e vazando.

No `frontend/`, **`npm test`** (vitest) cobre a lógica pura que erra em silêncio: dígitos verificadores de CPF/CNPJ, a ida-e-volta da máscara de moeda (é ela que transforma o que o usuário digitou no valor da prestação) e `dataBr` sem deslocamento de fuso.

**A regra de prazo das tarefas está escrita duas vezes** — `core/tarefa/Tarefa.ts` no backend e `types/tarefa.ts` no front. Podem divergir sem nada quebrar: a grade diria "em dia" e o servidor consideraria atrasada. `src/types/tarefa.test.ts` fixa os mesmos limiares dos dois lados (inclusive o `≤ 7 dias` inclusivo) e é onde a divergência aparece.

## Assistente da Fase V

Ícone ao lado da lupa na barra superior. Responde sobre a Fase V e sobre o uso do sistema **ancorado na documentação embarcada** — não no conhecimento geral do modelo. Backend: `POST /assistente` (streaming SSE) e `GET /assistente/status`.

A base é gerada por `npm run assistente:base` e **versionada** em `backend/src/infrastructure/assistente/base/` (~239 KB), como as tabelas de domínio: produção não precisa do `pdftotext` nem dos PDFs. Fontes: 5 manuais do TCESP, a síntese `REGRAS_NEGOCIO_FASE_V.md` e o **mapa de navegação extraído do `navigation.ts` do frontend** — é ele que impede o assistente de inventar caminho de tela.

- O corpus inteiro vai no prompt a cada pergunta, sem busca por trechos: a regra que responde costuma estar numa tabela que não repete as palavras da pergunta, e o que o modelo não recebe ele não cita — supõe. Com o manual todo à vista, "não encontrei na documentação" passa a ser verdade verificável.
- O corpus entra com `cache_control` (TTL 1h) antes de qualquer conteúdo volátil — a partir da 2ª pergunta custa ~1/10. Não coloque data, usuário ou id de requisição antes dele: invalida o cache inteiro.
- Modelo `claude-opus-5` com `effort: low` — a tarefa é localizar e reproduzir, não raciocinar longamente.
- **`npm run verificar:assistente`** confere que a base está completa e que o mapa de navegação bate com o menu real (nos dois sentidos). Rode depois de mexer em `navigation.ts` — menu alterado sem regerar a base faz o assistente ensinar tela que não existe.
- Sem `ANTHROPIC_API_KEY` o `status` responde `disponivel: false` e o ícone some da barra.

## Alertas do sino (prazos e pendências)

`GET /alertas` devolve prazos legais e pendências **calculados a cada consulta**, não gravados. Notificação armazenada nasce desatualizada — a certidão é renovada e o aviso continua lá —, e um prazo errado no sino é pior que sino vazio. Não há tabela nem processo de geração para manter.

Cinco fontes, todas em dados que já existem: prestação `REJEITADO`; `DocumentoRegularidade.dataVencimento` e `Certidao.vigenciaFinal`; `Ajuste`/`TermoAditivo.dataAssinatura` + 10 dias úteis; `Cliente.periodicidade` (Declaração Negativa, 5 ou 15 dias úteis); e 30/06 para a prestação anual.

- **Dias úteis sem feriados** (`shared/diasUteis.ts`): feriado empurra o vencimento para a frente, então o prazo calculado é sempre ≤ o real — avisa cedo, nunca tarde. É onde o calendário oficial encaixa quando existir. A tela diz isso ao usuário.
- Janela: aparece a partir de 30 dias do vencimento e some 60 dias depois de vencido — passado isso é pendência antiga, não alerta.
- O prazo de cadastro de Ajuste/Aditivo é **lembrete**, não status: esse cadastro é feito na tela do TCESP, fora daqui, então o sistema não sabe se já foi enviado. O texto do alerta não pode sugerir que sabe.
- **`npm run verificar:alertas`** roda as regras contra datas fixas, sem banco. Foi ele que mostrou que minha contagem de 10 dias úteis estava errada na cabeça, não no código.

## Dashboard

A tela de entrada mostra, além das contagens dos cadastros:

- **Faixa de execução das parcerias** no topo — valor global, repassado, pago e **em poder da OSC**. Fica acima das contagens de propósito: "quantos fornecedores tenho" é a informação menos acionável da tela e ocupava o lugar mais nobre. Reusa `GET /relatorios/execucao`; somar por conta própria faria o Dashboard mostrar um número e o relatório outro.
- **Cartão de Fiscalização** no rodapé — os quatro números do resumo e as **5 tarefas mais atrasadas**. Mostra atrasadas, não abertas: aberta é trabalho normal, atrasada é exceção que já passou despercebida.

Cada painel **só aparece com permissão** no recurso correspondente (`RELATORIOS`, `FISCALIZACAO`) e **some sozinho** se a consulta falhar ou se não houver dado — um cartão vazio na tela de entrada ensina a ignorá-la.

## Agenda de Compromissos

`/agenda` — reuniões de monitoramento, visitas in loco, Comissão de Monitoramento e Avaliação (Lei 13.019, arts. 58-59), audiências e compromissos no TCESP. Calendário mensal + lista.

**Compromisso *acontece*; tarefa *vence*.** É a distinção que justifica a tabela separada em vez de mais um recorte da Fiscalização: uma reunião não fica "atrasada há 3 dias" — ela ocorreu, foi cancelada, ou ainda vem. O que sobra dela é o **registro** do que foi tratado.

### Visibilidade — a regra de segurança do módulo

Três níveis, em ordem de precedência (`core/compromisso/visibilidade.ts`):

| Nível | Quem vê |
|---|---|
| `PARTICULAR` | **só o criador** |
| `RESTRITO` | criador + participantes + membros dos grupos convidados |
| `ORGAO` | todos do órgão (o recorte por tenant continua valendo por cima) |

- **Nem administrador vê um particular.** Perfil administrativo autoriza operar o sistema, não ler a agenda pessoal de um colega. Quem quiser essa exceção precisa criá-la de forma explícita e auditável, não herdá-la de um cargo.
- **A regra é aplicada na consulta**, em `PrismaCompromissoRepository.filtroDeVisibilidade` — não na tela. Manipular filtro, URL ou id não revela nada, porque o SQL já sai recortado. O `podeVer` puro do core existe para provar a mesma regra sem banco; se os dois divergirem, `verificar:agenda` acusa.
- **"Não é seu" e "não existe" devolvem a mesma resposta.** Um 403 distinguível de um 404 confirmaria que aquele id existe.
- **O vínculo de grupo é com o grupo, não com a lista de membros do momento** — quem entrar depois passa a ver, sem nada ser reprocessado.
- **Ver ≠ alterar.** Ser convidado dá direito de ver; alterar é do criador, do responsável, ou de quem tem faixa **Total** em `AGENDA` — e mesmo esse não alcança um particular. Reusa o RBAC existente em vez de criar uma escala paralela de ações.

### Recorrência e desempenho

- Guardada como **regra**, não materializada em linhas: um "toda semana, sem fim" seriam infinitas cópias, e editar a série passaria a ser varrer centenas delas. A expansão acontece na leitura (`expandirRecorrencia`), limitada por `MAX_OCORRENCIAS`.
- **A janela de datas é obrigatória** na API e limitada a 92 dias. Sem isso, abrir a agenda carregaria anos — e a expansão tornaria o custo pior. O índice `[clienteId, inicioEm]` serve exatamente a essa consulta.
- Ocorrência expandida vem marcada com `ocorrencia: true`; a tela avisa que editar ali altera a série inteira.

### Regras menores que carregam peso

- **O registro só existe depois de REALIZADO.** Guardar a ata de um encontro que o sistema considera não realizado deixaria o histórico afirmando o que foi tratado num evento que não houve. Voltar para agendado **apaga** o registro.
- **`RESTRITO` exige alguém.** Restrito sem participante nem grupo é um particular com o rótulo errado — e o rótulo é lido pela regra de segurança.
- **"Sem registro" não é atraso**: compromisso passado que continua `AGENDADO` significa que ninguém fechou o que houve.
- **Do compromisso nascem providências** (`Tarefa.compromissoId`). Compromisso que gerou tarefas **não pode ser excluído** — o caminho é **Cancelado**.
- Cor é **token da paleta**, não hex: a tela decide como pintar e o tema escuro continua legível.
- Lembrete guarda a **antecedência**, não o instante: se a reunião mudar de hora, ele acompanha. **Não há canal de e-mail** — modelar um que nada dispara seria pior que não ter: a estrutura sugere que funciona e o usuário confia num aviso que nunca vem.
- Os vínculos são substituídos por inteiro na edição — calcular o diff de participantes daria uma trilha mais fina, mas trocaria uma operação previsível por três.

### O lembrete no sino

O aviso aparece no **sino**, no padrão dos demais alertas: **calculado na consulta, nunca gravado**. Notificação armazenada nasce desatualizada — a reunião muda de hora e o aviso continua marcando a antiga.

- `GET /alertas` passou a **ter dono**: o sino carrega a agenda, e agenda tem visibilidade. Sem o espectador, o lembrete de um compromisso particular apareceria para todo mundo — o sino viraria a porta dos fundos.
- Medido em **minutos**, não em dias: a reunião é daqui a pouco. Por isso `dias` vai nulo e o texto diz "em 30 min" / "agora".
- Recorrência expandida também aqui, mas **só a próxima ocorrência**: avisar de todas as repetições futuras encheria o sino com a mesma reunião dezenas de vezes.
- O id é `compromisso:<id>:<minutosAntes>` — duas antecedências são dois avisos distintos.

### Vistas

**Dia**, **semana**, **mês** e **lista**. Dia e semana são a mesma `GradeHoraria` com 1 ou 7 colunas: separá-las duplicaria o posicionamento por horário, que é a única parte difícil — e onde um erro aparece como reunião no lugar errado do dia. Compromisso de **dia inteiro** fica numa faixa acima da grade, não ocupando 24 horas de altura.

**Cada vista pede exatamente a janela que mostra** — a de dia não carrega o mês.

### O que ainda falta

- Arrastar e redimensionar compromisso na grade (§15).
- Notificar o convidado na criação/alteração (§8).
- Recurso `AGENDA`. Coberto por `npm run verificar:agenda` (38 checagens) e pelos lembretes em `verificar:alertas`.

## Fiscalização | Monitoramento (Workflow)

`/fiscalizacao` — as providências e seus prazos. É a outra metade do sino: ele **calcula** prazos a partir dos dados, esta tela **registra o que foi feito** a respeito. Sem ela o sistema sabe cobrar e não sabe que já foi atendido, e um aviso que continua piscando depois de resolvido ensina o usuário a ignorá-lo.

Grade + formulário no padrão dos cadastros, com quatro recortes (Em aberto / Atrasadas / Minhas / Todas), KPIs no topo e **concluir a um clique** na grade — é o caminho comum do módulo, não algo escondido dentro do formulário.

- **Uma tarefa concluída só silencia o alerta que o sistema não consegue conferir sozinho.** É a regra central (`ALERTAS_SILENCIAVEIS`, em `core/tarefa/Tarefa.ts`): cadastro de Ajuste, cadastro de Aditivo e Declaração Negativa são atos praticados **na tela do TCESP**, fora daqui — a tarefa concluída é a única prova possível, e continuar cobrando seria ignorar o registro do usuário. Já **certidão, prestação rejeitada e prestação do exercício ficam de fora**: são fatos dos nossos próprios dados, e concluir tarefa não renova certidão nem muda o status no Tribunal. Nesses, a tarefa aparece ligada ao alerta e o alerta **permanece** — silenciá-los faria o sistema desmentir o que ele mesmo sabe.
- **`Tarefa.origemAlerta` guarda a chave do alerta** (`cadastro-ajuste:<id>`, `certidao:<id>`…), não um id de tabela: alerta não é gravado. É esse campo que liga as duas pontas, e por isso é **imutável na edição** — trocá-lo desligaria a tarefa do prazo que ela existe para atender.
- **Tarefa nascida de alerta é idempotente.** O botão "Gerar tarefa" fica a um clique e o sino é consultado por várias telas; sem isso, dois cliques viram duas tarefas para o mesmo prazo. Repetir a origem devolve a que já existe — exceto se ela foi **cancelada**, caso em que a providência foi descartada e o alerta volta a cobrar.
- **A criação acontece na tela, não com um POST do sino.** O botão leva a `/fiscalizacao` com o formulário já preenchido (título, prazo, ajuste e a chave de origem): o usuário ainda escolhe responsável e confere o prazo, e uma tarefa criada em silêncio apareceria depois sem dono nem contexto.
- `concluidaEm` é decidido pelo servidor a partir do status, nunca vem do payload: carimba na virada e **preserva o carimbo** enquanto continuar concluída, para uma edição de texto não reescrever a data do feito.
- **`Projeto` continua no schema e sem uso.** A tarefa liga direto ao `Ajuste`, que é o recorte do dia a dia; inventar projeto invisível só para satisfazer uma FK criaria linha que ninguém administra. `Tarefa.projetoId` virou opcional para isso.
- **`npm run verificar:workflow`** (sem banco) cobre validação, o carimbo da conclusão, a idempotência, a imutabilidade da origem e a própria lista de silenciáveis — acrescentar `CERTIDAO` a ela é o erro mais caro do módulo. O comportamento do silêncio é provado em `verificar:alertas`.
- Recurso `FISCALIZACAO`. Excluir exige faixa **Total**; para encerrar sem apagar histórico, o caminho é o status **Cancelada**.

## Isolamento multi-tenant (em migração)

Cada órgão só enxerga os próprios dados. O filtro vive numa **extension do Prisma** (`extensaoTenant.ts`), como a auditoria, e pelo mesmo motivo: vale para todo caminho que consulte, inclusive código futuro. Repositório novo sem a cláusula funcionaria perfeitamente para quem o escreveu — e para os outros órgãos também.

- **Só as raízes são filtradas.** `MODELS_COM_CLIENTE` sai do schema (14 models com `clienteId`, incluindo a trilha de auditoria) mais o `Cliente`, recortado pelo próprio `id`. Os outros 44 alcançam o órgão pelo pai — bloco da prestação → prestação → ajuste —, então filtrar a raiz fecha o caminho. Denormalizar `clienteId` nas 44 tabelas responderia com uma coluna o que a relação já responde.
- **Alguns filhos são filtrados por relação** (`POR_RELACAO`), porque há consultas que os alcançam **sem passar pelo pai** — e para esses "o pai já foi filtrado" é falso. São: `PrestacaoContas` (via `ajuste`), `TermoAditivo`, `DocumentoRegularidade`, `MembroDiretoria`, `MembroConselho`, `AtaDiretoriaArquivo` (via `entidade`) e `RelacaoEmpregado`, `ServidorCedido`, `EmpenhoPrestacao`, `DocumentoFiscal` (dois saltos, via `prestacao.ajuste`).

  Recortar **`PrestacaoContas`** fecha a subárvore inteira de ~28 blocos de uma vez, sem tocar em nenhum deles: todo caso de uso de bloco começa por `garantirPrestacao(id)`, então uma prestação de outro órgão simplesmente "não existe". Os demais entraram porque o sino (`PrismaAlertaRepository`) e o relatório do titular da LGPD (`PrismaTitularRepository`) os varrem direto — este último **por CPF**, o que sem recorte encontraria a mesma pessoa nos dados de todos os clientes.

- **Limite que resta:** filho alcançado pelo id do pai, fora dessa lista, continua confiando em que o pai foi validado antes. São UUID v4, que não se adivinha, mas isso não é isolamento — rota nova que consulte um filho por id precisa conferir o dono pela raiz, ou entrar em `POR_RELACAO`.
- Operação de chave única (`findUnique`, `update`, `delete`, `upsert`) recebe o filtro **ao lado** da chave (o Prisma exige uma no topo); as demais recebem por **`AND`**, para um filtro do chamador com a mesma chave não sobrescrever o do tenant.
- **Contexto sem órgão = sem filtro.** É o caso de seeds, scripts e startup — que precisam enxergar tudo — e, transitoriamente, de tokens antigos e usuários ainda sem órgão. O token leva o órgão no claim `cli`, lido no login; trocar um usuário de órgão só vale no próximo login.
- **`create` não é filtrado, é carimbado** — a extension de auditoria preenche `clienteId` junto do `criadoPor`, senão o backfill consertaria o passado enquanto o presente seguisse gerando órfãos.
- **`npm run verificar:tenant`** exercita a regra como função pura, sem banco.

**Ordem obrigatória do backfill (fase 4).** `Usuario.clienteId` só pode ser preenchido **junto** com o das demais raízes, nunca antes. Motivo: `permissoesCache` resolve o grupo por nome e passa pelo filtro; grupo não encontrado vira "nenhuma permissão configurada", que **libera tudo**. Um usuário com órgão cujo grupo ainda esteja sem órgão ganharia acesso total — não ficaria trancado.

### A migração, em ordem

As chaves de duplicidade dos cadastros (`Fornecedor.documento`, `Colaborador.cpf`, `BemCedido.identificador`, `ServidorCedidoCadastro.cpf`, `EntidadeBeneficiaria.cnpj`, `Empresa.cnpj`, `Ajuste.codigoAjuste`) ganharam o par `@@unique([clienteId, …])` **sem perder o `@unique` global**. Os dois convivem de propósito: enquanto `clienteId` é nulo em todo lugar, o composto não trava nada (no Postgres, `NULL` nunca conflita com `NULL`) e é o global que segura a duplicidade. Trocar os dois de uma vez abriria uma janela sem trava nenhuma.

Ordem obrigatória em produção:

1. **`db:push`** — cria as colunas e os índices compostos. Nada muda de comportamento.
2. **`npm run tenant:backfill`** — atribui um órgão a todos os registros sem dono, **numa transação só**. Com mais de um órgão cadastrado ele para e pede o id, em vez de adivinhar: adivinhar aqui é entregar os dados de um cliente a outro.
3. **Todos relogam** — o token só leva o órgão a partir do próximo login.
4. **O aperto** (ainda por fazer): remover os 8 `@unique` globais e tornar `clienteId` obrigatório nas 13 raízes. É o passo que consuma a migração, e só é seguro depois do backfill.

Enquanto o passo 2 não roda, **ninguém pode ter `clienteId` atribuído à mão** — cai na armadilha do RBAC descrita acima.

### Suporte — a equipe do fornecedor

O carimbo automático resolve o dia a dia (o admin da Prefeitura X só cria usuários da Prefeitura X) mas não o começo: o **primeiro** usuário de um cliente novo nasceria no órgão de quem o criou. Daí a marca `Usuario.suporte`.

- **A fronteira é um campo booleano do usuário, nunca um nome de grupo.** Grupo é cadastro livre — bastaria criar um chamado "Suporte" para furar o isolamento inteiro. A marca nasce desligada e só se concede por comando: `npm run suporte:conceder -- <email>` (`suporte:revogar`, `suporte:listar`). Vai no token como claim `sup`.
- **Suporte não é passe-livre.** Ele continua operando **dentro de um órgão de cada vez** — o que ganha é poder escolher qual, em `POST /suporte/atender`, que reemite o token com outro `cli`. O órgão atendido fica sempre à vista, na barra superior (`SeletorOrgao`, em âmbar): quem atende vários clientes precisa saber em qual está *antes* de digitar, porque lançamento no órgão errado é indistinguível de lançamento certo até alguém conferir. A troca recarrega a página — telas já carregadas mostrariam dados de um cliente sob o rótulo de outro.
- **Provisionar** (`/suporte/provisionar`) cria órgão + grupo `Administrador` + primeiro usuário **numa transação**. Meio provisionamento é pior que nenhum: órgão sem administrador não é acessável, e usuário sem grupo cai na regra de "grupo nunca configurado", que libera tudo. O endereço do admin fica em branco de propósito — o suporte não tem por que saber onde ele mora.
- As rotas `/suporte/*` ficam **fora do `exigirPermissao`**: a matriz é por órgão, e elas existem justamente antes de haver um. Quem não tem a marca recebe **404**, não 403 — 403 confirmaria que existe uma administração global.
- **`prismaGlobal`** (em `prisma.ts`) é o único client sem o recorte por órgão, e existe só para isso. `verificar:tenant` reprova qualquer import dele fora de `PrismaSuporteRepository` — é um furo que nenhum teste de funcionalidade pegaria, porque tudo continua funcionando.

**`GrupoUsuario.nome` é a exceção entre as chaves: o `@unique` global já saiu.** As outras sete identificam a mesma pessoa ou o mesmo ajuste em qualquer lugar, então a trava global ainda protege enquanto `clienteId` é nulo. Nome de grupo, não: dois órgãos têm legitimamente um `Administrador`, a trava não protegia nada e impedia provisionar o segundo cliente — foi a CI que mostrou, ao reprovar o teste de isolamento.

**Banco vazio não se alcança sozinho.** Sem usuário não há login, sem login não há token, e sem token não há como chamar `/suporte/provisionar`. `npm run bootstrap` é o único caminho que cria usuário sem ninguém autenticado: primeiro órgão + grupo + primeiro usuário **com a marca de suporte**, para que daí em diante tudo aconteça pela interface. Recusa rodar se já existir usuário.

## Permissões por grupo (RBAC)

O que cada grupo pode fazer em cada tela. `GrupoUsuario` → matriz de recursos × faixa; o banco guarda ações (`Permissao.modulo` + `acao`), a faixa é conceito de interface.

| Faixa | Ações gravadas |
|---|---|
| Sem acesso | — |
| Consulta | `READ` |
| Edição | `READ`, `CREATE`, `UPDATE` |
| Total | + `DELETE` |

`APPROVE` fica fora da escala: transmitir a prestação ao TCESP não é "editar mais forte", é assinar — alguém pode ter acesso total ao conteúdo e não poder transmitir.

- **Grupo sem permissão configurada = acesso a tudo.** Enquanto um grupo nunca tiver passado
  pela matriz, ele acessa tudo — o sistema funciona como antes de existir controle, sem seed
  nem configuração prévia. A verificação é **por grupo**: configurar um grupo não pode trancar
  os demais (a primeira versão desta regra era global e trancou todo mundo na primeira gravação).
- **Uma marca separa `nunca configurado` de `configurado para não acessar nada`.** Salvar a
  matriz grava sempre uma permissão no módulo reservado `__CONFIGURADO__`. Sem ela, restringir
  um grupo até o fim o liberaria por completo — o oposto exato da intenção de quem salvou.
- **Recurso não declarado = bloqueado.** O gate (`exigirPermissao`) roda por família de rotas e tira a ação do método HTTP (GET→READ, DELETE→DELETE, resto grava). Rota nova sem recurso não responde a ninguém, em vez de responder a todos.
- **`npm run verificar:permissoes`** reprova rota sem gate e recurso sem rota. É a verificação mais importante do conjunto: a falha aqui é silenciosa — rota sem `exigirPermissao` funciona perfeitamente para quem a criou, e para todo mundo mais também. Quem precisa ficar de fora se declara em `LIBERADAS`, **com o motivo**.
- O mesmo script confere **o menu do frontend**: tela em `navigation.ts` sem `recurso` não aparece na matriz, e o administrador configura tudo que vê concluindo que cobriu o sistema. Exceções se justificam em `MENU_SEM_RECURSO` — hoje o Dashboard (porta de entrada; cada painel dentro dela confere a própria permissão) e as **7 telas de Execução**, que são placeholders sem backend. Declarar recurso para elas agora criaria o oposto: permissão que a matriz oferece e não protege nada. Os recursos entram junto com as rotas, e aí o gate do servidor passa a exigi-los.
- **As permissões não entram no JWT.** Ficam no banco, com cache de 30s por grupo (`permissoesCache.ts`). No token, mudar uma permissão só valeria no próximo login — quem configurasse alteraria, testaria e concluiria que não funciona.
- **Trava contra auto-bloqueio:** ninguém pode salvar uma matriz que remova o acesso do **próprio grupo** a `CONFIG_GRUPOS` — a matriz é o único lugar de onde se reconfigura permissão, então seria irreversível pela interface. Vale para qualquer nome de grupo; a primeira versão olhava só para Administrador e Suporte e deixou de fora exatamente o caso que aconteceu.
- **`npm run permissoes:liberar`** apaga todas as concessões e devolve todos os grupos ao estado de nunca configurado (acesso a tudo). É a saída de emergência de quem se trancou: um comando explícito, e não uma exceção no código que enfraqueceria o controle todo dia.
- **Sem acesso não vê mensagem, vê o Dashboard.** O item já não aparece no menu; quem chega pela URL é redirecionado sem aviso (`RequerPermissao`). Uma tela de "acesso restrito" informaria a existência do que não deveria ser procurado.
- `npm run permissoes:seed` concede tudo à administração e consulta aos demais — só para grupos que ainda não têm nenhuma permissão, então rodar de novo não desfaz configuração feita à mão.
- A tela fica em **Configurações → Grupos de Usuários**, no ícone de escudo da grade.

## Espelho da Prestação de Contas

`/prestacao-contas/:id/espelho` — o documento inteiro numa página, para conferência antes de transmitir e para arquivo impresso. Botão **Espelho** no rodapé do dossiê da prestação.

Renderiza o **mesmo `documentoJSON`** que vai ao TCESP (`GET /prestacoes/:id/json`), não uma consulta própria. Se montasse os números por conta própria, poderia mostrar um total e o Tribunal receber outro — e a conferência esconderia justamente o erro que deveria revelar.

- **Bloco novo no montador aparece sozinho.** A renderização é genérica (lista vira tabela, objeto vira lista de campos) e `BLOCO_LABEL` só traduz o nome; sem rótulo, o bloco aparece com o nome humanizado em vez de sumir.
- **Erros e avisos no topo**, antes dos 29 blocos: quem abre o espelho para transmitir precisa saber o que barra o envio antes de ler o documento.
- Impressão pelo navegador (`@media print` em `index.css`): menu e barra somem, cabeçalho de tabela repete entre páginas, e `break-inside-avoid` evita bloco partido ao meio.
- Basta faixa **Consulta** em `PRESTACAO_CONTAS` — revisar não deveria exigir permissão de editar.

## Relatórios

`/relatorios` — acompanhamento gerencial. **Para dentro do órgão**, não para o Tribunal (isso é o Espelho) nem para o portal (isso é a Transparência). Três recortes, com filtro por ajuste e exercício, export CSV e impressão:

| Relatório | Responde |
|---|---|
| **Execução por ajuste** | do pactuado, quanto saiu do órgão e quanto a OSC já gastou |
| **Repasses: previsto × realizado** | atraso em dias e diferença de valor em cada parcela |
| **Prestações por situação** | panorama por exercício + **os ajustes que nunca prestaram contas** |

- **"Em poder da OSC" (repassado − pago) é o número que ninguém tinha à mão.** Não é irregular por si, mas é o que mostra dinheiro parado na conta da entidade. Negativo aparece em vermelho: pagou mais do que recebeu.
- **O atraso de repasse é achado clássico do TCESP**, e o dado sempre esteve ali — `RepassePrestacao` guarda `dataPrevista` e `dataRepasse` no mesmo registro. Faltava subtrair uma da outra. Linha com ≥ 5 dias ganha destaque.
- **O relatório de execução parte dos ajustes, não das prestações**, para que ajuste sem prestação nenhuma apareça com execução zerada — que é justamente o que se quer enxergar. Some-se a lista explícita em "por situação".
- **Cuidado de tenant, o primeiro que sai do papel:** `RepassePrestacao` e `Pagamento` **não** são raízes e a extension não os filtra. Toda consulta em `PrismaRelatorioRepository` parte das **prestações** (que descem de `Ajuste`, filtrado) e só então restringe os blocos aos ids obtidos. Agregar direto sobre os blocos somaria os valores de todos os órgãos — e daria um relatório errado sem erro nenhum.
- `QuadroRelatorio` é o molde: cada coluna diz como se desenha (`celula`), como se exporta (`texto`) e o que soma no rodapé (`rodape`). Relatório novo custa uma lista de colunas, não uma tela.
- Recurso `RELATORIOS`, faixa Consulta basta.

## Transparência

`/transparencia` — relação das parcerias para publicação no portal do órgão (Lei 13.019/2014, art. 10): data e identificação do instrumento, OSC e CNPJ, objeto, valor, vigência e situação da prestação de contas.

**A tela não publica nada.** Reúne o conteúdo e aponta o que falta; publicar segue sendo ato do órgão no portal oficial. Sugerir o contrário daria sensação falsa de conformidade.

- **A lista de pendências é o valor da tela.** A relação de parcerias qualquer sistema produz — dizer *qual delas está irregular* é o que evita a notificação do Tribunal. As regras estão em `ListarTransparenciaUseCase.pendenciasDe`.
- A situação vem da **prestação mais recente** de cada ajuste (art. 10, VII).
- Export em CSV com `;` e BOM — abre direto no Excel em português, que costuma ser a etapa seguinte da publicação.
- Recurso `TRANSPARENCIA`, faixa Consulta basta.

### Relatório para publicar (`/transparencia/relatorio`)

Botão **Relatório / PDF** na tela. Documento formal — cabeçalho institucional, base legal, resumo (parcerias, valor global, quantas têm prestação), tabela de 7 colunas com rodapé de total e linha de assinatura —, impresso pelo navegador (`window.print()` → salvar em PDF).

- **As pendências ficam de fora, de propósito.** A tela serve para caçá-las; o relatório é o que vai ao portal e ao processo, e publicar a própria lista de irregularidades não é o objetivo.
- **Sem variantes `dark:`.** É a folha de papel na tela, como um visualizador de PDF: no modo escuro o documento continua branco e o que se vê é o que sai na impressora. Com tema, quem trabalha no escuro imprimiria texto claro sobre papel branco — o navegador não imprime o fundo.
- O cabeçalho só nomeia o órgão quando **todas** as parcerias são do mesmo (`orgaoNome`, vindo de `Ajuste.cliente.nome`); com vários, um nome só seria mentira.
- O `@media print` do `index.css` é compartilhado com o Espelho; `print:!pl-0` no `AppLayout` tira o recuo do menu escondido.
