export type DevUserMode = "new" | "existing";

export const DEV_MODE_KEY = "wealthbuilder:dev-user-mode";
export const ONBOARDING_KEY = "wealthbuilder:onboarding-progress";

export function isDevUserMode(value: string | null): value is DevUserMode {
  return value === "new" || value === "existing";
}

export function resolveDevUserMode(queryValue: string | null, savedValue: string | null): DevUserMode {
  if (isDevUserMode(queryValue)) return queryValue;
  if (isDevUserMode(savedValue)) return savedValue;
  return "new";
}

export function routeForDevUser(mode: DevUserMode): "/onboarding" | "/home" {
  return mode === "existing" ? "/home" : "/onboarding";
}

export function devToolsEnabled(environment: string | undefined, flag: string | undefined): boolean {
  return environment !== "production" && flag !== "false";
}

export function saveDevUserMode(storage: Pick<Storage, "setItem" | "removeItem">, mode: DevUserMode): void {
  storage.setItem(DEV_MODE_KEY, mode);
  if (mode === "new") storage.removeItem(ONBOARDING_KEY);
}

export function resetDevState(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(DEV_MODE_KEY);
  storage.removeItem(ONBOARDING_KEY);
}
