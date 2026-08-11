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

Ainda **não há testes automatizados**. Antes de assumir que um comando existe, confira o `package.json` correspondente.

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
4. **Workflow** — `Projeto` (liga a `Ajuste` opcional) → `Tarefa` (`prazoLegal`, `prioridade`, `status`).

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

## Autenticação e auditoria

**Toda rota exige JWT**, exceto `/health` e `/auth/*`. O middleware `autenticar` valida o Bearer, popula `req.usuario` e abre um **`AsyncLocalStorage`** (`shared/contexto.ts`) com usuário e rota. É esse contexto que permite à camada de dados saber *quem* está operando sem que use cases e repositórios recebam o usuário como parâmetro — a regra de dependência continua intacta.

A trilha é gravada por uma **extension do Prisma Client** (`extensaoAuditoria.ts`), não por chamadas espalhadas pelos use cases: assim vale para qualquer caminho que grave, inclusive código novo.

- **Inclusão em cadastro não gera log** — a autoria fica no campo `criadoPor` do próprio registro, preenchido pela extension. Blocos da prestação, que não têm esse campo, geram `CRIACAO`.
- `ALTERACAO` guarda **só o diff** (`{ campo: { de, para } }`); `EXCLUSAO` guarda o registro inteiro (última chance de saber o que havia). Soft delete (`definirAtivo`) vira `INATIVACAO`/`REATIVACAO`.
- Operações em lote (a reimportação de CSV apaga e recria tudo) viram **uma** linha com a quantidade, não centenas.
- **Nunca logar** `senhaHash`, `resetTokenHash`, `resetTokenExpiresAt`; `buscaTexto` e `atualizadoEm` também ficam de fora, por serem derivados que mudam a cada gravação e só poluiriam o diff.
- Fora da trilha: tabelas de domínio (`Cbo`, `ClassificacaoEconomica`, `ComponenteDespesa`) e a própria `RegistroAuditoria` — que é **append-only** e se auditar-se-ia em laço infinito.
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
- `npx prisma format` / `npx prisma generate` — formatar o schema / gerar o client tipado.
- `npm run db:push` — aplicar o schema no banco (é o que o Render roda no deploy).
- `npm run dominios:gerar` / `npm run dominios:seed` — regerar e carregar CBO e classificação econômica (tabelas grandes, no banco).
- `npm run dominios:fase-v` — regerar as tabelas de domínio do JSON Schema (front + back).
- `npm run verificar:montador` — conferir o montador contra o schema e as regras de negócio (sem banco).
- `npm run verificar:auditoria` — conferir as regras da trilha de auditoria (sem banco).

No `frontend/`: `npm run dev` (Vite em :5173) e `npm run build`.

Não há framework de testes ainda; `verificar:montador` é a única checagem automatizada e roda como script.
