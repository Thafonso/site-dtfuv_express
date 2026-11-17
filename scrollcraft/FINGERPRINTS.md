# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| xpress-dtf-uv | Split stage | A divisória: linha móvel com os dois rótulos, mais um cap que monta sobre ela com a marca e o único CTA, e um índice vertical de 7 paradas na borda esquerda | Split 50/50 fixado, com planos de brilho, grade, decalque e taça em taxas distintas de parallax | pin > pin > pin > flow > pin > flow > flow > pin, 8 atos, 13,6 alturas de viewport | O colapso: a divisória viaja até 0% dentro do próprio ato de pico, a coluna DTF UV toma a largura inteira e a página termina em placa de contato com cue de valor único | "O destaque": scroll e arraste dobram o filme de volta sobre si mesmo, a arte fica nítida atrás dele e a divisória colapsa no mesmo gesto | Editorial industrial escuro, azul da marca como único acento | 4500 |

*(uma linha. A partir da proxima build, estas seis dimensoes sao a restricao:
quatro das seis precisam diferir desta linha.)*

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Split stage** como gramatica, com a divisoria fazendo as vezes de chrome.
- **O colapso da divisoria dentro do ato de pico** como padrao de fechamento.
- **"O destaque"**: dobra de filme dirigida por scroll e arraste.
- **8 atos em ~13,6 alturas de viewport**, na forma pin > pin > pin > flow > pin > flow > flow > pin.
- **Indice vertical de paradas na borda esquerda** como navegacao.
- Mundo **editorial industrial escuro com um unico acento azul**.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
