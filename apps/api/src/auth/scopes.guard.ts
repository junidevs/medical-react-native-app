import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AuthenticatedRequest } from "./auth.guard.js";

export const requiredScopesKey = "requiredScopes";

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(requiredScopesKey, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredScopes.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const hasAllScopes = requiredScopes.every((scope) =>
      request.user.scopes.includes(scope)
    );

    if (!hasAllScopes) throw new ForbiddenException("Missing required scope.");
    return true;
  }
}

