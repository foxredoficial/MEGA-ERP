import { describe, expect, it } from "vitest";
import { parseCsvBankStatement, parseOfxBankStatement } from "./bankStatement";

describe("bankStatement parsers", () => {
  it("parses CSV with dd/mm/yyyy and signed value", () => {
    const csv = "01/02/2026;PIX RECEBIDO;150,10\n02/02/2026;TARIFA;-5,00\n";
    const out = parseCsvBankStatement(csv);
    expect(out.length).toBe(2);
    expect(out[0].type).toBe("in");
    expect(out[0].amount).toBeCloseTo(150.1);
    expect(out[1].type).toBe("out");
    expect(out[1].amount).toBeCloseTo(5);
    expect(out[0].externalId.length).toBeGreaterThanOrEqual(8);
  });

  it("parses OFX STMTTRN blocks", () => {
    const ofx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNAMT>-12.34
<DTPOSTED>20260201120000[-3:BRT]
<MEMO>COMPRA CARTAO
<FITID>ABC123456
</STMTTRN>
<STMTTRN>
<TRNAMT>99.90
<DTPOSTED>20260202
<NAME>PIX RECEBIDO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    const out = parseOfxBankStatement(ofx);
    expect(out.length).toBe(2);
    expect(out[0].type).toBe("out");
    expect(out[0].amount).toBeCloseTo(12.34);
    expect(out[0].externalId).toBe("ABC123456");
    expect(out[1].type).toBe("in");
    expect(out[1].amount).toBeCloseTo(99.9);
  });
});

