# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

**Solução TS** é um SaaS multi-tenant para órgãos públicos de SP (Prefeituras, Câmaras, Autarquias, Fundações, Consórcios) prestarem contas de repasses ao **Terceiro Setor** exigidas pelo **TCESP — Audesp Fase V**. Além de montar/transmitir os artefatos ao Tribunal, tem um módulo de Workflow para controlar prazos legais.

O idioma do domínio e do código é **português** (nomes de entidades, campos e enums seguem a nomenclatura do TCESP).

## Estado atual do repositório

Projeto **greenfield / em modelagem**. Ainda **não há** `package.json`, build ou testes. O que existe hoje:
- `Documentação/` — manuais oficiais do TCESP, arquivos de exemplo (CSV/JSON), schema JSON de empenho, seed de órgãos e a síntese de regras.
- `backend/prisma/schema.prisma` — modelo de dados já revisado para o domínio real da Fase V.

Antes de assumir que um comando/dependência existe, verifique — a maior parte da stack abaixo é o **alvo planejado**, não algo já instalado.

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

## Prazos legais (regra que dirige o Workflow)

A Fase V tem **4 prazos distintos** que o Workflow deve controlar:
1. **Cadastro do Ajuste** — 10 dias úteis após a assinatura (interação direta/tela).
2. **Cadastro do Termo Aditivo** — 10 dias úteis após a assinatura (interação direta/tela).
3. **Declaração Negativa** — por **periodicidade do órgão** (fonte: `Fase_V_entidades`): **Quadrimestral** (Prefeituras/Autarquias/Fundações Típicas; UGEs estaduais) = 5 dias úteis após o quadrimestre; **Anual** (demais, ex. Câmaras) = 15 dias úteis após o ano.
4. **Prestação de Contas** — **anual e consolidada** (Manual v1.18 = "prestação anual"; descritor `mes = 12`), até **30/06 do exercício subsequente** ao repasse (repasse 2025 → até 30/06/2026). Piloto = 2025; obrigatório a partir de 01/jan/2026.

Ou seja, a periodicidade Quadrimestral/Anual do `Fase_V_entidades` dirige o prazo da **Declaração Negativa**; a **Prestação de Contas** é sempre anual (30/06). Detalhes em `Documentação/REGRAS_NEGOCIO_FASE_V.md` (§5).

## Comandos (após a inicialização do backend)

Ainda não configurados. Ao inicializar, os fluxos esperados de Prisma são:
- `npx prisma validate` / `npx prisma format` — validar/formatar o schema.
- `npx prisma migrate dev` — criar/aplicar migrations em desenvolvimento.
- `npx prisma generate` — gerar o client tipado.

Atualize esta seção com os scripts reais de build/lint/test assim que o `package.json` existir.
