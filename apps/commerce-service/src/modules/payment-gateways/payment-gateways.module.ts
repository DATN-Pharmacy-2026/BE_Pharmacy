import { Module } from '@nestjs/common';
import { EventBusModule } from '@app/event-bus';
import { PaymentGatewayCallbackService } from './payment-gateway-callback.service';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';
import { PaymentGatewaysController } from './payment-gateways.controller';
import { PaymentGatewaySignatureService } from './payment-gateway-signature.service';
import { PaymentGatewayStatusMapperService } from './payment-gateway-status-mapper.service';
import { PaymentGatewaysService } from './payment-gateways.service';
import { MomoPaymentAdapter } from './adapters/momo-payment.adapter';
import { VnpayPaymentAdapter } from './adapters/vnpay-payment.adapter';
import { ZalopayPaymentAdapter } from './adapters/zalopay-payment.adapter';

@Module({
  imports: [EventBusModule],
  controllers: [PaymentGatewaysController],
  providers: [
    PaymentGatewaysService,
    PaymentGatewayConfigService,
    PaymentGatewaySignatureService,
    PaymentGatewayStatusMapperService,
    PaymentGatewayCallbackService,
    VnpayPaymentAdapter,
    MomoPaymentAdapter,
    ZalopayPaymentAdapter,
  ],
  exports: [PaymentGatewaysService],
})
export class PaymentGatewaysModule {}
