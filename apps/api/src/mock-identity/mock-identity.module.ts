import { Module } from "@nestjs/common";

import { MockIdentityController } from "./mock-identity.controller.js";

@Module({
  controllers: [MockIdentityController]
})
export class MockIdentityModule {}

