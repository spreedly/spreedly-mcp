import { describe, it, expect } from "vitest";
import { certificateTools } from "../../src/domains/certificates/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakeCertificate } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = certificateTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("certificate tools", () => {
  it("creates a certificate", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["POST /certificates.json", { data: fakeCertificate() }]]),
    );
    await findTool("spreedly_certificate_create").handler({}, { transport });
    expect(calls[0].method).toBe("POST");
  });

  it("generates a certificate", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["POST /certificates/generate.json", { data: fakeCertificate() }]]),
    );
    await findTool("spreedly_certificate_generate").handler({}, { transport });
    expect(calls[0].method).toBe("POST");
  });

  it("lists certificates", async () => {
    const list = { certificates: [fakeCertificate().certificate] };
    const { transport } = createMockTransport(
      new Map([["GET /certificates.json", { data: list }]]),
    );
    const result = await findTool("spreedly_certificate_list").handler({}, { transport });
    expect(result).toEqual(list);
  });

  it("updates a certificate", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["PUT /certificates/FakeCertToken_cert001.json", { data: fakeCertificate() }]]),
    );
    await findTool("spreedly_certificate_update").handler(
      { certificate_token: "FakeCertToken_cert001", certificate: { pem: "new-pem" } },
      { transport },
    );
    expect(calls[0].method).toBe("PUT");
  });

  it("has correct number of tools", () => {
    expect(certificateTools.length).toBe(4);
  });
});
