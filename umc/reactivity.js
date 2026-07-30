/**
 * Lightweight reactivity helpers for UMC widgets.
 *
 *   cell(initial)           — mutable value + subscribers
 *   watchSource(sub, fn)    — subscribe; source invokes fn with current snapshot
 *   scheduleFrame(host,key,fn) — coalesce to one rAF per host+key
 *   disposeBag(host)        — collect teardown fns (run on widget Destroyed)
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

/** Per-widget dispose list — cleared in defineUmc Destroyed. */
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
