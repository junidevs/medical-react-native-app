import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { loadEnv } from "./env.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadEnv],
      cache: true
    })
  ]
})
export class AppConfigModule {}

