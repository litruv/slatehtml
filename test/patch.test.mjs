import { test } from "node:test";
import assert from "node:assert";
import { patchAttr } from "../editor/patch.mjs";

// Run with: npm test

const source = [
  "@parent textblock",
  "",
  "--- html ---",
  '<panel width="100" height="40">',
  '  <textblock label="hi" />',
  '  <!-- width="not-an-attribute" -->',
  "</panel>",
].join("\n");

const line = (text, no) => text.split(/\r?\n/)[no - 1];

test("replaces an existing quoted value", () => {
  const out = patchAttr(source, 4, "width", "200");
  assert.equal(line(out, 4), '<panel width="200" height="40">');
  assert.equal(out, source.replace('width="100"', 'width="200"'));
});

test("adds a missing attribute to the opening tag", () => {
  const out = patchAttr(source, 4, "gap", "8");
  assert.equal(line(out, 4), '<panel width="100" height="40" gap="8">');
});

test("handles self-closing tags", () => {
  const out = patchAttr(source, 5, "label", "bye");
  assert.equal(line(out, 5), '  <textblock label="bye" />');
  assert.equal(line(patchAttr(out, 5, "width", "10"), 5), '  <textblock label="bye" width="10" />');
});

test("comments and other lines are untouched", () => {
  const out = patchAttr(source, 6, "width", "1");
  assert.equal(out, source, "line 6 has no opening tag");
  assert.equal(line(patchAttr(source, 4, "width", "200"), 6), line(source, 6));
  assert.equal(line(patchAttr(source, 4, "width", "200"), 1), line(source, 1));
});

test("preserves CRLF line endings", () => {
  const crlf = source.replace(/\n/g, "\r\n");
  const out = patchAttr(crlf, 4, "width", "200");
  assert.ok(out.includes("\r\n"), "line endings kept");
  assert.equal(line(out, 4), '<panel width="200" height="40">');
  assert.equal(line(out, 5), line(crlf, 5));
});

test("normalises quotes and keeps values containing a double quote", () => {
  assert.equal(line(patchAttr('<panel width=\'100\'>', 1, "width", "200"), 1), '<panel width="200">');
  assert.equal(line(patchAttr('<panel width="100">', 1, "text", 'a "b"'), 1), '<panel width="100" text=\'a "b"\'>');
});

test("an attribute name inside another value is not patched", () => {
  const out = patchAttr('<panel text="width=10" width="20">', 1, "width", "30");
  assert.equal(line(out, 1), '<panel text="width=10" width="30">');
});

test("empty value removes the attribute, boolean attrs gain a value", () => {
  assert.equal(line(patchAttr(source, 4, "width", ""), 4), '<panel height="40">');
  assert.equal(line(patchAttr("<panel fill>", 1, "fill", "2"), 1), '<panel fill="2">');
  assert.equal(patchAttr(source, 4, "columns", ""), source, "absent attr stays absent");
});

test("lines outside the file are left alone", () => {
  assert.equal(patchAttr(source, 99, "width", "1"), source);
});
