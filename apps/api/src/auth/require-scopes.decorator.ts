import { SetMetadata } from "@nestjs/common";

import { requiredScopesKey } from "./scopes.guard.js";

export function RequireScopes(...scopes: string[]) {
  return SetMetadata(requiredScopesKey, scopes);
}

