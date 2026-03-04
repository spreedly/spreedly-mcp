import { describe, it, expect } from "vitest";
import { environmentTools } from "../../src/domains/environments/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakeEnvironment, fakeAccessSecret } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = environmentTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("environment tools", () => {
  it("creates an environment", async () => {
    const { transport, calls } = createMockTransport(new Map([["POST /environments.json", { data: fakeEnvironment() }]]));
    await findTool("spreedly_environment_create").handler({ environment: { name: "Test" } }, { transport });
    expect(calls[0].method).toBe("POST");
  });

  it("lists environments", async () => {
    const list = { environments: [fakeEnvironment().environment] };
    const { transport } = createMockTransport(new Map([["GET /environments.json", { data: list }]]));
    const result = await findTool("spreedly_environment_list").handler({}, { transport });
    expect(result).toEqual(list);
  });

  it("shows an environment", async () => {
    const { transport } = createMockTransport(new Map([["GET /environments/FakeEnvKey_env001.json", { data: fakeEnvironment() }]]));
    const result = await findTool("spreedly_environment_show").handler({ environment_key: "FakeEnvKey_env001" }, { transport });
    expect(result).toEqual(fakeEnvironment());
  });

  it("creates an access secret", async () => {
    const { transport, calls } = createMockTransport(new Map([["POST /environments/FakeEnvKey_env001/access_secrets.json", { data: fakeAccessSecret() }]]));
    await findTool("spreedly_environment_create_access_secret").handler({ environment_key: "FakeEnvKey_env001" }, { transport });
    expect(calls[0].method).toBe("POST");
  });

  it("lists access secrets", async () => {
    const list = { access_secrets: [fakeAccessSecret().access_secret] };
    const { transport } = createMockTransport(new Map([["GET /environments/FakeEnvKey_env001/access_secrets.json", { data: list }]]));
    const result = await findTool("spreedly_environment_list_access_secrets").handler({ environment_key: "FakeEnvKey_env001" }, { transport });
    expect(result).toEqual(list);
  });

  it("deletes an access secret", async () => {
    const { transport, calls } = createMockTransport(new Map([["DELETE /environments/FakeEnvKey_env001/access_secrets/FakeASToken_as001.json", { data: {} }]]));
    await findTool("spreedly_environment_delete_access_secret").handler({ environment_key: "FakeEnvKey_env001", access_secret_key: "FakeASToken_as001" }, { transport });
    expect(calls[0].method).toBe("DELETE");
  });

  it("regenerates signing secret", async () => {
    const { transport, calls } = createMockTransport(new Map([["POST /environments/FakeEnvKey_env001/regenerate_signing_secret.json", { data: {} }]]));
    await findTool("spreedly_environment_regenerate_signing_secret").handler({ environment_key: "FakeEnvKey_env001" }, { transport });
    expect(calls[0].method).toBe("POST");
  });

  it("has correct number of tools", () => {
    expect(environmentTools.length).toBe(9);
  });
});
