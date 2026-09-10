import { IsIn, IsString, IsUUID } from "class-validator";

export class ResolvePairingDto {
  @IsString()
  @IsUUID()
  pairId!: string;

  @IsIn(["approve", "deny"])
  decision!: "approve" | "deny";
}
