# Arquivos de logo

## A convenção

O sufixo **`-dark` diz o fundo a que a arte serve, não o tom dela**. `logo.png`
vai sobre fundo claro (texto escuro); `logo-dark.png` vai sobre fundo escuro
(texto claro). Ler ao contrário é o erro fácil aqui, e ele não quebra nada — só
deixa a marca invisível, que é pior, porque a tela continua "funcionando".

## A palette

Lida dos próprios arquivos, não de um manual:

| Elemento | Fundo claro | Fundo escuro |
|---|---|---|
| Símbolo — barra | `rgb(78,141,201)` | `rgb(78,141,201)` — **não muda** |
| Símbolo — "T" | `rgb(48,45,44)` | `rgb(237,240,244)` |
| Texto | `rgb(48,45,44)` | `rgb(237,240,244)` |

**O símbolo é bicolor.** A barra é sempre o azul da marca; o "T" acompanha a cor
do texto. Tratar o símbolo como uma cor só apaga metade dele — e o resultado
continua parecendo um logo, só que errado, que é como isso passa despercebido.

## As três famílias

| Arquivo | Tam. | Arranjo | Texto | Onde |
|---|---|---|---|---|
| `logo.png` / `logo-dark.png` | 244×78 | empilhado | escuro / claro | Sobre o sistema |
| `logo-deitada.png` / `-dark.png` | 800×192 | deitado | escuro / claro | barra superior (menu recolhido) |
| `logo-menu.png` / `logo-menu-dark.png` | 800×192 | deitado | **branco** | barra lateral |
| `logo-vertical.png` / `-dark.png` | 600×587 | vertical | escuro / claro | telas de entrada |

### Cuidado com `logo-menu`

Os dois arquivos `logo-menu*` são **iguais em cor**: texto branco e símbolo
azul. Servem só onde o fundo é escuro por conta própria — o azul da barra
lateral no tema claro, o `ink-900` no tema escuro. **Sobre fundo branco some o
texto e sobra o símbolo.** Foi exatamente esse o bug que deu origem à família
`logo-deitada`.

Por serem iguais, a barra lateral usa **um `<img>` só**, sem o par
`dark:hidden`/`dark:block` dos outros lugares: trocar de arquivo por tema faria
o navegador baixar duas vezes o mesmo desenho. Os dois nomes continuam
existindo porque a convenção vale para a pasta inteira, e um dia a arte pode
divergir — aí o segundo `<img>` volta.

Desde 24/09/2026 a arte é **800×192** (antes 350×124): mais que o dobro da
resolução, o que a deixa nítida em tela de alta densidade, e **aparada na caixa
útil** — sem a moldura transparente que a versão antiga tinha. Por isso a mesma
altura em CSS rende um logo maior: o número pedido é o que se vê, como já
acontecia com `logo-deitada`.

O tamanho em CSS é limitado **pelos dois lados** (`max-h-12 max-w-[184px]`), e
isso já se provou necessário: a proporção mudou duas vezes num dia (2,82:1 →
3,08:1 → 4,17:1), e a cada vez o limite que passou a valer foi outro. Com só um
dos dois, a arte teria atravessado o botão de recolher sem que nada acusasse.

A conta do espaço: a barra tem 264px, o cabeçalho gasta 32 de recuo (`px-4`) e
o botão de recolher 36 (`p-2` + ícone de 20). Sobram 196; 184 deixa a folga.

### `logo-deitada` — onde o par por tema **é** necessário

A barra superior é o caso inverso da lateral: o fundo dela acompanha o tema —
branco no claro, `ink-950` no escuro. Uma arte só deixaria o texto invisível em
metade das vezes, e foi exatamente esse o bug que deu origem a esta família.

Desde 24/09/2026 as duas também são **800×192**, aparadas na caixa útil:

- **`logo-deitada.png`** — texto escuro, para o fundo branco do tema claro.
- **`logo-deitada-dark.png`** — texto branco. Hoje é **byte a byte igual** a
  `logo-menu.png`: texto branco serve tanto ao azul da barra lateral quanto ao
  grafite da superior. Ainda assim são arquivos separados, porque as duas
  famílias respondem a fundos diferentes e podem divergir sem aviso.

Tamanho em CSS: `max-h-11 max-w-[200px]`. A altura decide; a largura é a rede,
para que arte mais larga não empurre a busca global para a direita.

### De onde veio `logo-deitada`

Derivada de `logo-menu.png` por recolorização, não desenhada: mesma arte, mesmas
formas, com a palette acima. O mapeamento é peça a peça, e é o ponto todo:

| Na arte do menu | Vira |
|---|---|
| azul-marinho `rgb(4,72,144)` (a barra) | azul da marca |
| branco (o "T" e o texto) | cor do texto do tema |

A borda suavizada é interpolada entre as duas cores de destino na mesma
proporção em que estava entre as de origem — classificar cada pixel na força
serrilha o contorno.

A arte é **aparada na caixa útil**, ao contrário de `logo-menu.png`, que tem
moldura transparente. Por isso a mesma altura em CSS rende um logo maior aqui:
o número pedido é o que se vê.

Se a arte de origem mudar, é regerar em vez de editar à mão.
