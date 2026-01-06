import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithAdmin } from 'src/common/guards/admin-auth/admin-auth.guard';

export const AdminEmail = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<RequestWithAdmin>();
        return request.adminEmail;
    },
);