import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { AuthenticatedRequest } from "./auth.guard.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  }
);

