import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPreferredAvatarSeedForIdentities,
  setPreferredAvatarChoiceForIdentities,
} from "@/lib/avatar-preferences";
import {
  serializeAvatarChoice,
  type AppAvatarChoice,
} from "@/lib/app-avatar";

function installWindowStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const dispatchEvent = vi.fn();

  vi.stubGlobal("window", {
    localStorage,
    dispatchEvent,
  });

  return { dispatchEvent, values };
}

describe("avatar preferences", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the selected avatar under canonical and alias identities", () => {
    const { dispatchEvent } = installWindowStorage();
    const choice: AppAvatarChoice = {
      provider: "dicebear",
      id: "bottts-neutral::demo-user::option-1",
    };

    setPreferredAvatarChoiceForIdentities(
      "demo@example.com",
      ["Demo User"],
      choice,
    );

    expect(getPreferredAvatarSeedForIdentities(["demo@example.com"])).toBe(
      serializeAvatarChoice(choice),
    );
    expect(getPreferredAvatarSeedForIdentities(["demo user"])).toBe(
      serializeAvatarChoice(choice),
    );
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });

  it("syncs the employee demo settings email with the header display identity", () => {
    installWindowStorage();
    const choice: AppAvatarChoice = {
      provider: "alohe",
      id: "upstream_22",
    };

    setPreferredAvatarChoiceForIdentities("nhanvien@congty.vn", [], choice);

    expect(getPreferredAvatarSeedForIdentities(["Demo User"])).toBe(
      serializeAvatarChoice(choice),
    );
    expect(getPreferredAvatarSeedForIdentities(["demo@aitroly.local"])).toBe(
      serializeAvatarChoice(choice),
    );
  });

  it("overwrites stale header avatar when settings selects a new demo avatar", () => {
    installWindowStorage();
    const staleHeaderChoice: AppAvatarChoice = {
      provider: "dicebear",
      id: "initials::demo user::old",
    };
    const settingsChoice: AppAvatarChoice = {
      provider: "dicebear",
      id: "bottts-neutral::nhanvien@congty.vn::option-1",
    };

    setPreferredAvatarChoiceForIdentities(
      "Demo User",
      [],
      staleHeaderChoice,
    );
    setPreferredAvatarChoiceForIdentities(
      "nhanvien@congty.vn",
      [],
      settingsChoice,
    );

    expect(getPreferredAvatarSeedForIdentities(["Demo User"])).toBe(
      serializeAvatarChoice(settingsChoice),
    );
  });

  it("syncs manager demo identities without leaking to employee demo", () => {
    installWindowStorage();
    const managerChoice: AppAvatarChoice = {
      provider: "alohe",
      id: "teams_9",
    };

    setPreferredAvatarChoiceForIdentities("quanly@congty.vn", [], managerChoice);

    expect(getPreferredAvatarSeedForIdentities(["Chị Quản lý"])).toBe(
      serializeAvatarChoice(managerChoice),
    );
    expect(getPreferredAvatarSeedForIdentities(["Demo User"])).toBeNull();
  });
});
