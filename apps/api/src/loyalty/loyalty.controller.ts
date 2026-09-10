import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireScopes } from "../auth/require-scopes.decorator.js";
import { ScopesGuard } from "../auth/scopes.guard.js";
import { LoyaltyService } from "./loyalty.service.js";

@ApiTags("loyalty")
@ApiBearerAuth()
@Controller("loyalty")
@UseGuards(AuthGuard, ScopesGuard)
@RequireScopes("access_as_user")
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.getSummary(user);
  }
}
