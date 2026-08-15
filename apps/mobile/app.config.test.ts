import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { ConfigContext } from "expo/config";

import createExpoConfig from "./app.config";

describe("Expo web assets", () => {
  it("configures a checked-in favicon for browser requests", () => {
    const config = createExpoConfig({ config: {} } as ConfigContext);

    expect(config.web?.favicon).toBe("./assets/favicon.png");
    expect(existsSync(fileURLToPath(new URL(config.web?.favicon ?? "", import.meta.url)))).toBe(
      true,
    );
  });
});
