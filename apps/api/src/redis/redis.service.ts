import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const redisUrl = configService.getOrThrow<string>("redisUrl");
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2
    });
  }

  getClient() {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

