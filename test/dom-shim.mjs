globalThis.HTMLElement ??= class HTMLElement {};
globalThis.customElements ??= {
  get() {
    return undefined;
  },
  define() {},
};
