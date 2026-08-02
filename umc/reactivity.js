/**
 * Lightweight reactivity helpers for UMC widgets.
 *
 *   cell(initial)          , mutable value + subscribers
 *   watchSource(sub, fn)   , subscribe; source invokes fn with current snapshot
 *   watchSize(el, fn)      , ResizeObserver → { width, height } (rAF-coalesced)
 *   scheduleFrame(host,key,fn), coalesce to one rAF per host+key
 *   disposeBag(host)       , collect teardown fns (run on widget Destroyed)
 */

/** @typedef {(fn: () => void) => () => void} SubscribeFn */

/** Mutable reactive cell. */
export function cell(initial) {
  let value = initial;
  const subs = new Set();

  const notify = () => {
    for (const fn of subs) fn(value);
  };

  return {
    get value() {
      return value;
    },
    set value(next) {
      if (Object.is(next, value)) return;
      value = next;
      notify();
    },
    peek() {
      return value;
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/**
 * Subscribe to an external source. The `subscribe` fn should register `fn` and
 * invoke it once with the current snapshot (see `onSession` / `onRoomsChanged`).
 */
export function watchSource(subscribe, fn) {
  if (typeof subscribe !== "function") {
    throw new Error("watchSource: subscribe must be a function");
  }
  return subscribe(fn);
}

/**
 * Element that generates a layout box. Walks through `display: contents`
 * hosts to the stamped panel / face (UMC default shell).
 */
export function layoutBox(el) {
  if (!(el instanceof Element)) return null;
  try {
    if (getComputedStyle(el).display === "contents") {
      for (const child of el.children) {
        const nested = layoutBox(child);
        if (nested) return nested;
      }
      return null;
    }
  } catch {
    /* ignore */
  }
  return el;
}

/** Read border-box size from a ResizeObserver entry (or getBoundingClientRect). */
export function boxSize(el, entry) {
  const box = entry?.borderBoxSize?.[0];
  if (box && Number.isFinite(box.inlineSize) && Number.isFinite(box.blockSize)) {
    return { width: box.inlineSize, height: box.blockSize };
  }
  if (entry?.contentRect) {
    return { width: entry.contentRect.width, height: entry.contentRect.height };
  }
  const target = layoutBox(el) || el;
  if (target instanceof Element) {
    const r = target.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }
  return { width: 0, height: 0 };
}

/**
 * Observe an element's laid-out size. Invokes `fn({ width, height })` on the
 * first observation and whenever the box changes (coalesced to one rAF).
 * Returns an unsubscribe function.
 *
 *   api.watchSize(({ width, height }) => { … });
 *
 * For `display: contents` hosts, observes the stamped layout child.
 */
export function watchSize(el, fn) {
  if (!(el instanceof Element) || typeof fn !== "function") return () => {};
  const target = layoutBox(el) || el;
  if (typeof ResizeObserver === "undefined") {
    fn(boxSize(target));
    return () => {};
  }

  let lastW = NaN;
  let lastH = NaN;
  const deliver = (size) => {
    const w = Math.round(size.width * 100) / 100;
    const h = Math.round(size.height * 100) / 100;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    fn({ width: w, height: h });
  };

  const ro = new ResizeObserver((entries) => {
    const entry = entries.find((e) => e.target === target) || entries[0];
    scheduleFrame(el, "size", () => deliver(boxSize(target, entry)));
  });
  ro.observe(target);
  deliver(boxSize(target));
  return () => ro.disconnect();
}

/** Coalesce rapid updates (sync bursts, resize, typing) to one paint per frame. */
export function scheduleFrame(host, key, fn) {
  if (!host || typeof fn !== "function") return;
  const bag = host.__umcFrame ?? (host.__umcFrame = {});
  const k = key || "default";
  if (bag[k]) return;
  bag[k] = requestAnimationFrame(() => {
    bag[k] = 0;
    if (host.isConnected !== false) fn();
  });
}

export function cancelScheduledFrame(host, key) {
  const bag = host?.__umcFrame;
  if (!bag) return;
  if (key == null) {
    for (const k of Object.keys(bag)) {
      if (bag[k]) cancelAnimationFrame(bag[k]);
    }
    host.__umcFrame = null;
    return;
  }
  const k = key || "default";
  if (bag[k]) {
    cancelAnimationFrame(bag[k]);
    bag[k] = 0;
  }
}

/** Per-widget dispose list, cleared in defineUmc Destroyed. */
export function disposeBag(host) {
  if (!host.__umcDispose) host.__umcDispose = [];
  return host.__umcDispose;
}

export function runDisposeBag(host) {
  const bag = host?.__umcDispose;
  if (!bag?.length) return;
  while (bag.length) {
    try {
      const fn = bag.pop();
      fn?.();
    } catch (err) {
      console.warn("[umc] dispose failed", err);
    }
  }
  cancelScheduledFrame(host);
}
