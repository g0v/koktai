// tests/extract/labels.test.ts
import { describe, expect, test } from "bun:test";
import { classifyLabel } from "../../lib/extract/labels.ts";

describe("label classification", () => {
  test("registers and accents", () => {
    expect(classifyLabel("文")).toEqual([{ dim: "register", value: "文" }]);
    expect(classifyLabel("漳")).toEqual([{ dim: "geo", value: "漳" }]);
  });
  test("combined labels split", () => {
    expect(classifyLabel("廈、泉")).toEqual([
      { dim: "geo", value: "廈" }, { dim: "geo", value: "泉" }]);
    expect(classifyLabel("廈泉")).toEqual([
      { dim: "geo", value: "廈" }, { dim: "geo", value: "泉" }]);
    expect(classifyLabel("文白")).toEqual([
      { dim: "register", value: "文" }, { dim: "register", value: "白" }]);
    expect(classifyLabel("文語")).toEqual([
      { dim: "register", value: "文" }, { dim: "register", value: "語" }]);
  });
  test("sources, phenomena, certainty", () => {
    expect(classifyLabel("台日典")).toEqual([{ dim: "source", value: "台日典" }]);
    expect(classifyLabel("訓讀")).toEqual([{ dim: "phenomenon", value: "訓讀" }]);
    expect(classifyLabel("？")).toEqual([{ dim: "certainty", value: "？" }]);
  });
  test("prose parentheses are rejected", () => {
    expect(classifyLabel("可在副位")).toBeNull();
    expect(classifyLabel("古送切，送韻")).toBeNull();
    expect(classifyLabel("無雜念，專注丌妙")).toBeNull();
  });
});