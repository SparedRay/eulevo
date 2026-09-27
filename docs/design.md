# Eu Levo — design notes

Visual identity **Azulejo** (option C·4 on the design canvas "Housewarming Gift List").

## Colours (`src/styles/tokens.css`)

| Token | Hex | Use |
|---|---|---|
| paper | `#FAF8F3` | page background |
| ink | `#14213D` | text, outline buttons |
| cobalt | `#1E4FA3` | primary buttons, card borders, tile band |
| sky | `#E3EAF6` | soft fills, "you are bringing" strip |
| sand | `#F4E6C8` | alternate photo fill |
| muted | `#3A4660` | secondary text (passes 4.5:1 on paper) |
| line / input-line | `#C9D3E6` / `#9AA4B8` | card and input borders |
| available | `#1E6B3A` | "Ainda disponível" status (host) |

## Type

- **DM Serif Display**: titles and gift names.
- **Atkinson Hyperlegible**: everything else. It was designed for readers with low vision.
- Body text is 18px; secondary text is at least 16px; titles are 34–42px.

## Motifs

- Portuguese tile band (diamond + dot, 28px repeat) at the top of screens.
- Photos sit in arch-topped frames with a 2px cobalt border.
- 12px radius on buttons and fields; 18px on cards.

## UX rules (older guests and hosts must manage alone)

1. One column on phones. No filters, tabs, swipes or hidden gestures.
2. Buttons are at least 56px tall and always labelled in words: "Quero levar este", "Sim, confirmo que levo", "Não, voltar para a lista". No icon-only controls.
3. Nothing is saved without a confirm step with explicit Sim / Não. Releasing a gift also asks "Tem certeza?".
   The first tap must not sound final: it says what the guest *wants* ("Quero levar este"), and the confirm screen opens with "Falta confirmar" and asks "Você confirma…?". Early testers read "Eu levo este" + "Você escolheu" as already done.
4. The party date and time are repeated as a plain sentence on every guest screen.
5. "Você vai levar N presentes" is always at the top of the list once the guest has picked something.
6. Sharing location is one checkbox, off by default. The browser permission prompt only appears after it is ticked.
7. Repeatable gifts say it in words: "Várias pessoas podem levar. 2 pessoas já vão levar."
8. Errors say what to do next ("Confira sua internet e tente de novo"), never codes.

## Guest flow

`/l/:token` list → `/l/:token/g/:gift` confirm → `/done/:gift` thank you (with calendar + address)
                                         ↘ `/taken/:gift` "Alguém acabou de escolher este presente"
`/l/:token/mine`: what I'm bringing, with "Não posso levar".
