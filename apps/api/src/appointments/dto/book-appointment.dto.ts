import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class BookAppointmentDto {
  @IsUUID()
  slotId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(280)
  reason!: string;
}

