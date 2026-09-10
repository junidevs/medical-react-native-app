import { IsIn, IsString, IsUUID, MinLength } from "class-validator";

export class RegisterDeviceDto {
  @IsIn(["ios", "android"])
  platform!: "ios" | "android";

  @IsString()
  @MinLength(10)
  deviceToken!: string;

  @IsUUID()
  installationId!: string;
}

