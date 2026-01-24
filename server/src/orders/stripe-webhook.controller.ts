import { Controller, Headers, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import type { Response, Request } from 'express';

@ApiTags('Webhooks')
@Controller('stripe')
export class StripeWebhookController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    @ApiOperation({ summary: 'Stripe webhook endpoint for payment verification' })
    @ApiHeader({
        name: 'stripe-signature',
        description: 'Stripe signature for webhook verification',
        required: true,
    })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    @ApiResponse({ status: 400, description: 'Webhook signature verification failed' })
    async handleStripeWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() request: RawBodyRequest<Request>,
        @Res() response: Response,
    ) {
        try {
            if (!request.rawBody) {
                return response
                    .status(HttpStatus.BAD_REQUEST)
                    .send('Webhook Error: Missing raw body');
            }

            await this.orderService.handleStripeWebhook(
                request.rawBody,
                signature,
            );

            return response.status(HttpStatus.OK).json({ received: true });
        } catch (error) {
            return response
                .status(HttpStatus.BAD_REQUEST)
                .send(`Webhook Error: ${error.message}`);
        }
    }
}
