# Tutorials

Hands-on guides that build on each other. Each tutorial links to reference docs where needed.

| # | Tutorial | Time | You'll build |
|---|----------|------|--------------|
| 1 | [Your first widget](./01-first-widget.md) | ~15 min | A `title-bar` component with declarative bind |
| 2 | [Composing components](./02-composing-components.md) | ~20 min | A message row from nested widgets + parent state |
| 3 | [Events & interaction](./03-events-and-interaction.md) | ~15 min | A clickable `slate-button` with public events |
| 4 | [Dynamic lists](./04-dynamic-lists.md) | ~20 min | A scrollable message list with `data-content` |

## Prerequisites

- Node.js 18+
- Basic HTML familiarity
- For tutorials 1–4: the `example/` app or your own Vite project with `slatehtml/umc/vite`

```bash
git clone <repo>
cd slatehtml
cd example && npm install && npm run dev
```

For layout-only exploration (no Vite):

```bash
npm run demo   # opens index.html gallery
```

## Recommended path

1. Skim [Layout & positioning](../layout.md) and play with `npm run demo` — especially overlay and canvas sections.
2. Work through tutorials 1 → 4 in order.
3. Read [UMC components](../umc.md) as a reference while you code.
4. Install the [VS Code extension](../../editors/vscode-umc/README.md) for the [component playground](../component-playground.md).

## Example app map

The Discord example under `example/widgets/` is the "graduation project" for these tutorials:

```
discord-app.umc            ← root shell
  └─ matrix-shell.umc      ← routing state (tutorial 2 pattern)
       ├─ matrix-scope.umc
       ├─ matrix-room-list.umc
       └─ matrix-chat-roll.umc
            └─ matrix-message-list.umc  ← dynamic list (tutorial 4)
                 └─ user-message.umc    ← composition (tutorial 2)
```

Open any `.umc` file and use **UMC: Open Preview to the Side** to see it in isolation.
