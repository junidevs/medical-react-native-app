import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireScopes } from "../auth/require-scopes.decorator.js";
import { ScopesGuard } from "../auth/scopes.guard.js";
import { RegisterDeviceDto } from "./dto/register-device.dto.js";
import { NotificationsService } from "./notifications.service.js";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(AuthGuard, ScopesGuard)
@RequireScopes("access_as_user")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("register")
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto
  ) {
    return this.notificationsService.register(user, dto);
  }
}

