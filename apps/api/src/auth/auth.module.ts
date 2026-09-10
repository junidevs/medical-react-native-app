import { Module } from "@nestjs/common";

import { AuthGuard } from "./auth.guard.js";
import { ScopesGuard } from "./scopes.guard.js";

@Module({
  providers: [AuthGuard, ScopesGuard],
  exports: [AuthGuard, ScopesGuard]
})
export class AuthModule {}

