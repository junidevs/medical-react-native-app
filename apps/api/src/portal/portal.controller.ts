import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireScopes } from "../auth/require-scopes.decorator.js";
import { ScopesGuard } from "../auth/scopes.guard.js";
import { ApiException } from "../common/api-exception.js";
import { ResolvePairingDto } from "./dto/resolve-pairing.dto.js";
import { PortalService } from "./portal.service.js";

@ApiTags("portal")
@ApiBearerAuth()
@Controller("portal")
@UseGuards(AuthGuard, ScopesGuard)
@RequireScopes("access_as_user")
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get("session")
  createSession(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return this.portalService.createSession(user, baseUrl);
  }

  // Called by the authenticated mobile app after scanning the browser's QR code.
  // Binds the signed-in patient's identity to the pending browser pairing.
  @Post("pair/resolve")
  async resolvePairing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolvePairingDto
  ) {
    const record = await this.portalService.resolvePairing(dto.pairId, user, dto.decision);
    if (!record) {
      throw new ApiException({
        code: "NOT_FOUND",
        message: "Kod parowania wygasł lub został już użyty. Odśwież stronę portalu."
      });
    }
    return { status: record.status };
  }
}
