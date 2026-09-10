import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

import { AuthenticatedUser } from "./authenticated-user.js";

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

function getBearerToken(request: Request) {
  const header = request.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function parseScopes(payload: JWTPayload) {
  const rawScopes = typeof payload["scp"] === "string" ? payload["scp"] : "";
  return rawScopes.split(" ").filter(Boolean);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function toUser(payload: JWTPayload): AuthenticatedUser {
  const id = typeof payload["oid"] === "string" ? payload["oid"] : payload.sub;
  if (!id) throw new UnauthorizedException("Missing user identifier.");

  // Entra access tokens often omit "email"; fall back to preferred_username/upn,
  // and finally a stable per-user placeholder so the unique DB column never collides.
  const email =
    firstString(payload["email"], payload["preferred_username"], payload["upn"]) ??
    `${id}@no-email.medconnect.local`;

  return {
    id,
    email,
    name: typeof payload["name"] === "string" ? payload["name"] : "MedConnect user",
    scopes: parseScopes(payload)
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly acceptedAudiences: string[];

  constructor(private readonly configService: ConfigService) {
    const jwksUri = this.configService.getOrThrow<string>("jwksUri");
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
    // Entra v1 access tokens carry aud="api://<clientId>" while v2 tokens carry the
    // bare "<clientId>". Accept both so the same guard works regardless of token version.
    const audience = this.configService.getOrThrow<string>("audience");
    const bareAudience = audience.replace(/^api:\/\//, "");
    this.acceptedAudiences = Array.from(new Set([audience, bareAudience, `api://${bareAudience}`]));
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getBearerToken(request);
    if (!token) throw new UnauthorizedException("Missing bearer token.");

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.configService.getOrThrow<string>("issuer"),
        audience: this.acceptedAudiences,
        algorithms: ["RS256"]
      });
      request.user = toUser(payload);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const reason = error instanceof Error ? error.message : "Token validation failed.";
      throw new UnauthorizedException(reason);
    }
  }
}

