import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireScopes } from "../auth/require-scopes.decorator.js";
import { ScopesGuard } from "../auth/scopes.guard.js";
import { ApiException } from "../common/api-exception.js";
import { IdempotencyService } from "../idempotency/idempotency.service.js";
import { AppointmentsService } from "./appointments.service.js";
import { BookAppointmentDto } from "./dto/book-appointment.dto.js";

@ApiTags("appointments")
@ApiBearerAuth()
@Controller("appointments")
@UseGuards(AuthGuard, ScopesGuard)
@RequireScopes("access_as_user")
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly idempotencyService: IdempotencyService
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("cursor") cursor?: string) {
    return this.appointmentsService.listForUser(user, cursor);
  }

  @Get(":appointmentId")
  get(@CurrentUser() user: AuthenticatedUser, @Param("appointmentId") id: string) {
    return this.appointmentsService.getForUser(user, id);
  }

  @Get(":appointmentId/check-in")
  checkInQr(@CurrentUser() user: AuthenticatedUser, @Param("appointmentId") id: string) {
    return this.appointmentsService.createCheckInQr(user, id);
  }

  @Post(":appointmentId/cancel")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("appointmentId") id: string) {
    return this.appointmentsService.cancel(user, id);
  }

  @Post()
  @ApiHeader({ name: "Idempotency-Key", required: true })
  book(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BookAppointmentDto,
    @Headers("idempotency-key") idempotencyKey?: string
  ) {
    if (!idempotencyKey) {
      throw new ApiException({
        code: "BAD_REQUEST",
        message: "Idempotency-Key header jest wymagany."
      });
    }

    return this.idempotencyService.run(idempotencyKey, dto, () =>
      this.appointmentsService.book(user, dto)
    );
  }
}

