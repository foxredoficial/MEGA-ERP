import { describe, expect, it } from "vitest";
import { formatBRLFromCents } from "@/lib/money";

describe("money", () => {
  it("formatBRLFromCents formata em reais com centavos", () => {
    const formatted = formatBRLFromCents(19900);
    expect(formatted).toContain("R$");
    expect(formatted).toContain(",");
  });
});
