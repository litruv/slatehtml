# Tutorial 3: Events & interaction

Make a `slate-button` that publishes UMG-style events (`clicked`, `pressed`, …) instead of exposing raw DOM listeners. You'll learn the `events` map, `On*` hooks, and how parents listen for child interaction.

**Prerequisites:** [Tutorial 1](./01-first-widget.md), [UMC events](../umc.md#events).

## Why widget events?

Raw `click` works on DOM nodes, but UserWidget-style events:

- Give a **stable public API** (`clicked` won't break if you swap `<button>` for a `horizontalbox`).
- Support **`addEventListener("clicked", …)`** and `onClicked` in hyperscript.
- Enable **autocomplete** in the VS Code extension (`OnClicked`, `emit("clicked")`).

## Reference implementation

The repo ships `example/widgets/lib/slate-button.umc`. This tutorial walks through the same ideas.

## Step 1: Markup and chrome

```umc
--- html ---
<textblock class="slate-button-label" data-umc="text"></textblock>

--- style ---
self {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  --widget-padding: 6px 12px;
  --widget-radius: 4px;
  padding: var(--widget-padding);
  border: var(--widget-border, 1px solid currentColor);
  background: var(--widget-background, transparent);
  border-radius: var(--widget-radius);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

self:hover:not([disabled]) {
  filter: brightness(1.08);
}

self[disabled] {
  opacity: 0.45;
  pointer-events: none;
}
```

Note `display: inline-flex` on `self` — this widget **is** the painted control, not `display: contents`.

## Step 2: Declare the event map

```js
export default defineUmc({
  tag: "slate-button",
  attrs: {
    text: "Button",
    disabled: "",
  },

  events: {
    click: "clicked",
    dblclick: "doubleclicked",
    mousedown: "pressed",
    mouseup: "released",
  },
```

The loader wires native DOM → `CustomEvent` on the host with the published name.

Optional handler (autocomplete suggests `OnClicked` after you add `click: "clicked"`):

```js
  OnClicked(el, api, nativeEvent) {
    if (el.hasAttribute("disabled")) {
      nativeEvent.preventDefault();
      return;
    }
    console.log("clicked:", api.attr("text"));
  },
```

## Step 3: Accessibility

```js
  Construct(el) {
    el.setAttribute("role", "button");
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");

    el.addEventListener("keydown", (e) => {
      if (el.hasAttribute("disabled")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        el.click();
      }
    });
  },

  SynchronizeProperties(el) {
    const disabled = el.hasAttribute("disabled");
    el.setAttribute("aria-disabled", disabled ? "true" : "false");
    el.tabIndex = disabled ? -1 : 0;
  },
});
```

## Step 4: Listen from a parent

In a parent widget's `Construct`:

```js
Construct(el) {
  el.addEventListener("clicked", (e) => {
    if (e.target.closest("slate-button")?.matches("[data-action=send]")) {
      // handle send
    }
  });
},
```

Or query and bind directly:

```js
Construct(el) {
  const send = el.querySelector('[data-action="send"]');
  send?.addEventListener("clicked", () => {
    el.emit("messagesent", { text: "…" });
  });
},
```

Use **bubbling** (`el.addEventListener` on the host) for delegate-style handling, or **direct** listeners on child refs.

## Step 5: Fire your own events

Children report up; parents re-emit or set attrs:

```js
// In child
api.emit("valuechanged", { value: 42 });

// In parent Construct
el.querySelector("my-slider")?.addEventListener("valuechanged", (e) => {
  el.setAttribute("volume", String(e.detail.value));
});
```

## Step 6: Preview

```umc
--- preview ---
<verticalbox gap="10" padding="12">
  <horizontalbox gap="8">
    <slate-button text="Primary"></slate-button>
    <slate-button text="Disabled" disabled></slate-button>
  </horizontalbox>
  <textblock kind="hint" text="Open devtools → click the button"></textblock>
</verticalbox>
```

## Native leaf events (built-in)

SlateHTML leaf widgets already emit:

| Widget | Event |
|--------|-------|
| `checkbox` | `changed` |
| `slider` | `percentchanged` |
| `editabletext` | `textchanged`, `committed` |

No `events` map needed — listen on the element directly.

## Checkpoint

- [ ] `events: { native: "published" }` maps DOM to widget API
- [ ] `OnClicked` / `OnPressed` hooks for side effects
- [ ] Parent listens with `addEventListener("clicked", …)`
- [ ] `el.emit()` for custom child → parent messages

## Next

[Dynamic lists →](./04-dynamic-lists.md)

## Reference

- `example/widgets/lib/slate-button.umc`
- `example/widgets/nav/server-rail.umc` — selection + `serverchanged` event
- [VS Code extension: autocomplete](../../editors/vscode-umc/README.md)
