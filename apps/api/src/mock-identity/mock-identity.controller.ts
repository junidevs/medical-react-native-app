import { Controller, ForbiddenException, Get, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getMockJwks, mintMockAccessToken } from "@medconnect/mock-identity";

@Controller("mock-identity")
export class MockIdentityController {
  constructor(private readonly configService: ConfigService) {}

  @Get(".well-known/openid-configuration")
  configuration() {
    this.assertMockIdentityEnabled();
    const issuer = this.configService.getOrThrow<string>("issuer");
    return {
      issuer,
      jwks_uri: `${issuer}/jwks`,
      token_endpoint: `${issuer}/token`,
      authorization_endpoint: `${issuer}/authorize`
    };
  }

  @Get("jwks")
  jwks() {
    this.assertMockIdentityEnabled();
    return getMockJwks();
  }

  @Post("token")
  async token() {
    this.assertMockIdentityEnabled();
    const accessToken = await mintMockAccessToken({
      issuer: this.configService.getOrThrow<string>("issuer"),
      audience: this.configService.getOrThrow<string>("audience")
    });

    return {
      token_type: "Bearer",
      expires_in: 900,
      access_token: accessToken,
      refresh_token: "mock-refresh-token",
      id_token: accessToken
    };
  }

  private assertMockIdentityEnabled() {
    const authMode = this.configService.getOrThrow<"mock" | "entra">("authMode");
    const enabled = this.configService.getOrThrow<boolean>("features.mockIdentity");
    if (authMode !== "mock" || !enabled) {
      throw new ForbiddenException("Mock identity provider is disabled.");
    }
  }
}

