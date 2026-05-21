import { describe, expect, it } from "vitest";

import {
  createAdminSessionToken,
  parseAdminSessionToken,
  verifyAdminCredentials
} from "./auth";

describe("verifyAdminCredentials", () => {
  it("accepts the configured admin email and password", async () => {
    expect(
      await verifyAdminCredentials({
        email: "admin@example.com",
        password: "correct-password",
        adminEmail: "admin@example.com",
        adminPassword: "correct-password"
      })
    ).toBe(true);
  });

  it("rejects mismatched credentials", async () => {
    expect(
      await verifyAdminCredentials({
        email: "admin@example.com",
        password: "wrong-password",
        adminEmail: "admin@example.com",
        adminPassword: "correct-password"
      })
    ).toBe(false);
  });
});

describe("admin session token", () => {
  it("round trips a signed session token", async () => {
    const token = await createAdminSessionToken({
      email: "admin@example.com",
      secret: "session-secret",
      now: new Date("2026-05-19T00:00:00Z")
    });

    await expect(
      parseAdminSessionToken({
        token,
        secret: "session-secret",
        now: new Date("2026-05-20T00:00:00Z")
      })
    ).resolves.toEqual({ email: "admin@example.com" });
  });

  it("rejects expired session tokens", async () => {
    const token = await createAdminSessionToken({
      email: "admin@example.com",
      secret: "session-secret",
      now: new Date("2026-05-19T00:00:00Z")
    });

    await expect(
      parseAdminSessionToken({
        token,
        secret: "session-secret",
        now: new Date("2026-06-20T00:00:00Z")
      })
    ).resolves.toBeNull();
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await createAdminSessionToken({
      email: "admin@example.com",
      secret: "session-secret",
      now: new Date("2026-05-19T00:00:00Z")
    });

    await expect(
      parseAdminSessionToken({
        token,
        secret: "different-secret",
        now: new Date("2026-05-20T00:00:00Z")
      })
    ).resolves.toBeNull();
  });
});
