import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { RequireScopes } from "../auth/require-scopes.decorator.js";
import { ScopesGuard } from "../auth/scopes.guard.js";
import { DoctorsService } from "./doctors.service.js";

@ApiTags("doctors")
@ApiBearerAuth()
@Controller("doctors")
@UseGuards(AuthGuard, ScopesGuard)
@RequireScopes("access_as_user")
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  listDoctors(@Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.doctorsService.listDoctors(cursor, Number(limit ?? 20));
  }

  @Get(":doctorId/slots")
  listSlots(@Param("doctorId") doctorId: string) {
    return this.doctorsService.listSlots(doctorId);
  }
}

