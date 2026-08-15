import { describe, expect, it } from "vitest";

import { FOVARI_DOMAIN_VERSION } from "./index";

describe("domain foundation", () => {
  it("exports the first version of the shared domain contract", () => {
    expect(FOVARI_DOMAIN_VERSION).toBe(1);
  });
});
