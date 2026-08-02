# Tutorial 4: Dynamic lists

Build a `message-list` that fills a scroll area from data using `data-content`, `el.set()`, and `el.add()`. This is how the Discord example renders chat history.

**Prerequisites:** [Tutorial 2](./02-composing-components.md), [UMC content API](../umc.md#content-region-data-content).

## What you're building

A scrollable column of `user-message` rows that updates when `server` or `channel` attrs change, with new messages appended at the bottom.

## Step 1: Mark the content slot

```umc
--- html ---
<scrollbox class="message-list-scroll" fill padding="16 0">
  <verticalbox class="chat-messages" gap="12">
    <chat-welcome></chat-welcome>
    <verticalbox class="message-rows" data-content gap="12"></verticalbox>
  </verticalbox>
</scrollbox>

--- script ---
export default defineUmc({
  tag: "message-list",
  attrs: { server: "slate", channel: "general" },
```

`data-content` tells the runtime where `add` / `set` / `clear` append children. Only **one** content region per widget (the first `[data-content]` match).

## Step 2: Replace rows with `el.set()`

```js
function messageSpec(m) {
  return {
    tag: "user-message",
    author: m.author,
    color: m.color,
    time: m.time,
    text: m.text,
    avatar: m.avatar || "",
  };
}

SynchronizeProperties(el, { attr }) {
  const serverId = attr("server", "slate");
  const channelId = attr("channel", "general");

  el.querySelector("chat-welcome")?.setAttribute("channel", channelId);

  const messages = messagesFor(serverId, channelId); // your data source
  el.set(...messages.map(messageSpec));

  queueMicrotask(() => scrollToBottom(el));
},
```

`el.set(a, b, c)` **replaces** all content-slot children. Each argument can be:

- `{ tag: "user-message", author: "…", … }`, create element
- A DOM `Node`
- A string (text node)
- An array (flattened)

## Step 3: Append with `el.add()`

Wrap `add` in `Initialize` to auto-scroll when new messages arrive:

```js
Initialize(el) {
  const apiAdd = el.add.bind(el);

  el.add = (item) => {
    if (!el.isConnected) return null;

    const spec = isPlainMessage(item) ? messageSpec(item) : item;
    const node = apiAdd(spec);

    queueMicrotask(() => scrollToBottom(el));
    return node;
  };
},

function isPlainMessage(item) {
  return (
    item != null &&
    typeof item === "object" &&
    !(item instanceof Node) &&
    !Array.isArray(item) &&
    !item.tag &&
    ("text" in item || "author" in item)
  );
}

function scrollToBottom(el) {
  const scroll = el.querySelector("scrollbox.message-list-scroll");
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}
```

Usage from a parent or script:

```js
messageList.add({
  author: "Nova",
  color: "#5865f2",
  time: "9:15 PM",
  text: "New message!",
});
```

## Step 4: Layout requirements

The list only scrolls if `scrollbox` has a bounded height:

```html
<!-- Parent gives height -->
<message-list style="height: 360px"></message-list>

<!-- Or fill in a flex shell -->
<chat-roll fill> … <message-list> inside vertical fill chain … </chat-roll>
```

See [Layout: scrollbox](../layout.md#scrollbox). Don't fix scrolling with CSS `overflow` on a random `div`.

## Step 5: Preview with realistic height

```umc
--- preview ---
<message-list server="slate" channel="general" style="height: 360px"></message-list>
```

Import your data module in the script section if preview needs real messages:

```js
import { messagesFor } from "../../data.js";
```

## Data flow in the Discord app

```
matrix-shell (scope, room attrs)
    → matrix-chat-roll (forwards attrs)
        → matrix-message-list (el.set from live timeline)
            → user-message × N
```

Sending a message (`chat-composer`) appends to data then calls `messageList.add(…)` or refreshes the channel.

## `clear()` and incremental updates

| API | Use when |
|-----|----------|
| `el.set(…)` | Channel changed, replace entire list |
| `el.add(…)` | New message arrived, append one row |
| `el.clear()` | Empty the slot without replacing parent markup |

Avoid calling `set` on every tick, it's a full replace. For huge lists, consider virtualizing in `SynchronizeProperties` or patching DOM manually (advanced).

## Checkpoint

- [ ] `data-content` marks the append target
- [ ] `el.set(...specs)` rebuilds the list from data
- [ ] `el.add(spec)` appends one item
- [ ] `scrollbox` + `fill` + parent height enables scroll
- [ ] `SynchronizeProperties` syncs when `server` / `channel` change

## Graduation

You've covered the core SlateHTML stack:

1. Panel layout ([layout guide](../layout.md))
2. `.umc` widgets ([UMC guide](../umc.md))
3. Composition, events, and dynamic content (tutorials 1-4)

Explore the full Discord example:

```bash
cd example && npm run dev
```

Pick any file under `example/widgets/` and open the UMC preview.

## Reference

- `example/widgets/chat/message-list.umc`
- `example/widgets/chat/chat-composer.umc`, sending messages
- `example/data.js`, static message data
