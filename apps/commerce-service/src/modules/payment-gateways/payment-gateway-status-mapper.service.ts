import { Injectable } from '@nestjs/common';
import { PaymentGatewayTransactionStatus } from '.prisma/client/commerce';

@Injectable()
export class PaymentGatewayStatusMapperService {
  fromCode(
    code: string | number | undefined | null,
  ): PaymentGatewayTransactionStatus {
    const text = `${code ?? ''}`;
    if (text === '00' || text === '0')
      return PaymentGatewayTransactionStatus.PAID;
    if (['24', '1006', '1007'].includes(text))
      return PaymentGatewayTransactionStatus.CANCELED;
    if (['51', '49', '99'].includes(text))
      return PaymentGatewayTransactionStatus.FAILED;
    return PaymentGatewayTransactionStatus.PENDING;
  }
}
