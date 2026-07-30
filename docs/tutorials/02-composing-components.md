# Tutorial 2: Composing components

Build a `user-message` row from smaller widgets — avatar, meta line, and body text. You'll learn auto-import, nesting `.umc` files, and the parent/child state pattern used across the Discord example.

**Prerequisites:** [Tutorial 1](./01-first-widget.md), [UMC components](../umc.md#composition--auto-import).

## Pattern: attrs down, events up

SlateHTML doesn't have a global store or context API. Instead:

1. **Parent** owns state as element attributes (`author`, `text`, …).
2. **`SynchronizeProperties`** pushes attrs to child components.
3. **Children** bubble custom events when the user acts.
4. **Parent `Construct`** listens and updates its own attrs.

See `matrix-shell.umc` for app-level routing (`scope`, `room`).

## What you're building

```
┌────┬──────────────────────────────────┐
│ AV │ Nova  9:14 PM                    │
│    │ Hello from SlateHTML!            │
└────┴──────────────────────────────────┘
```

## Step 1: Create leaf widgets

### `message-meta.umc`

```umc
--- html ---
<horizontalbox gap="8" valign="baseline">
  <textblock class="author" data-umc="author"></textblock>
  <textblock class="time" data-umc="time" kind="mono"></textblock>
</horizontalbox>

--- style ---
.author {
  font-weight: 600;
  font-size: 15px;
}
.time {
  font-size: 12px;
  opacity: 0.5;
}

--- script ---
export default defineUmc({
  tag: "message-meta",
  attrs: { author: "User", color: "#333", time: "" },
  SynchronizeProperties(el, { attr }) {
    const color = attr("color", "#333");
    el.querySelector(".author")?.style.setProperty("color", color);
  },
});

--- preview ---
<message-meta author="Nova" color="#5865f2" time="9:14 PM"></message-meta>
```

### `message-text.umc`

```umc
--- html ---
<textblock class="body" data-umc="value"></textblock>

--- style ---
.body {
  font-size: 15px;
  line-height: 1.375;
  white-space: pre-wrap;
  word-break: break-word;
}

--- script ---
export default defineUmc({
  tag: "message-text",
  attrs: { value: "" },
});

--- preview ---
<message-text value="Hello from SlateHTML!"></message-text>
```

Use `data-umc-prop` when the child attr name differs from the host attr (`value` vs `text`).

## Step 2: Compose in `user-message.umc`

```umc
--- html ---
<horizontalbox class="message-row" gap="14" padding="4 16" valign="top">
  <user-display-picture size="40"></user-display-picture>
  <verticalbox class="message-content" gap="4" fill>
    <message-meta></message-meta>
    <message-text></message-text>
  </verticalbox>
</horizontalbox>

--- style ---
.message-row:hover {
  background: rgba(0, 0, 0, 0.04);
}
.message-content {
  min-width: 0;
}

--- script ---
export default defineUmc({
  tag: "user-message",
  attrs: {
    author: "User",
    color: "#333",
    time: "",
    text: "",
    avatar: "",
  },

  SynchronizeProperties(el, { attr }) {
    const author = attr("author", "User");
    const color = attr("color", "#333");

    const pic = el.querySelector("user-display-picture");
    pic?.setAttribute("name", author);
    pic?.setAttribute("color", color);
    const src = attr("avatar", "");
    if (src) pic?.setAttribute("src", src);
    else pic?.removeAttribute("src");

    const meta = el.querySelector("message-meta");
    meta?.setAttribute("author", author);
    meta?.setAttribute("color", color);
    meta?.setAttribute("time", attr("time", ""));

    el.querySelector("message-text")?.setAttribute("value", attr("text", ""));
  },
});

--- preview ---
<verticalbox gap="8" padding="12">
  <user-message
    author="Nova"
    color="#5865f2"
    time="9:14 PM"
    text="Hello from SlateHTML!"
  ></user-message>
</verticalbox>
```

### Auto-import

You did **not** write `import "./message-meta.umc"`. The Vite loader scans the `html` section and resolves:

- `message-meta` → `widgets/message/message-meta.umc` (or sibling path)
- `user-display-picture` → existing widget in the repo

Keep custom tags in a `widgets/` tree so resolution finds them.

## Step 3: Preview composed children

The VS Code preview loads **every `.umc` in the same folder** as the open file. For `user-message.umc` in `widgets/message/`, siblings like `message-meta.umc` register automatically.

For cross-folder children, either:

- Open the parent's preview (loader walks the folder), or
- Add `umc.preview.imports` in settings for extra modules.

## Step 4: App-level parent (optional)

Wire many messages under a shell:

```umc
--- html ---
<horizontalbox fill>
  <matrix-room-list></matrix-room-list>
  <matrix-chat-roll fill></matrix-chat-roll>
</horizontalbox>

--- script ---
export default defineUmc({
  tag: "matrix-shell",
  attrs: { scope: "dms", room: "" },

  Construct(el) {
    el.addEventListener("roomchanged", (e) => {
      el.setAttribute("room", e.detail.roomId);
    });
  },

  SynchronizeProperties(el, { attr }) {
    const room = attr("room", "");
    el.querySelector("matrix-room-list")?.setAttribute("active", room);
    el.querySelector("matrix-chat-roll")?.setAttribute("room", room);
  },
});
```

The shell doesn't know about `user-message` directly — `matrix-chat-roll` → `matrix-message-list` does.

## Layout tip: `fill` and `min-width: 0`

In a horizontal row, the text column needs `fill` on the `verticalbox` and `min-width: 0` so long text wraps instead of overflowing. This is a flex quirk, not a SlateHTML special case — but fix it in the tag tree / widget CSS, not with `width: 100%` hacks on random nodes.

## Checkpoint

- [ ] Nested custom tags in `--- html ---` without manual imports
- [ ] `SynchronizeProperties` pushes host attrs to `querySelector` children
- [ ] `data-umc` on leaves; manual `setAttribute` when children have different attr names
- [ ] Preview section demonstrates realistic composition

## Next

[Events & interaction →](./03-events-and-interaction.md)

## Reference

- `example/widgets/message/user-message.umc`
- `example/widgets/matrix/matrix-shell.umc`
- [UMC: Composition](../umc.md#composition--auto-import)
