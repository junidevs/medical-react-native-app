import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@medconnect/shared";

export interface ApiExceptionBody {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiException extends HttpException {
  constructor(body: ApiExceptionBody, status = HttpStatus.BAD_REQUEST) {
    super(body, status);
  }
}

export function slotAlreadyBookedException() {
  return new ApiException(
    {
      code: "SLOT_ALREADY_BOOKED",
      message: "Ten termin został już zarezerwowany. Wybierz inny slot."
    },
    HttpStatus.CONFLICT
  );
}

