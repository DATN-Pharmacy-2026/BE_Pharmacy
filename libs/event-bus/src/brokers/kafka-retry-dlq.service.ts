import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KafkaRetryDlqService {
  private readonly logger = new Logger(KafkaRetryDlqService.name);

  async publishRetryTopic(): Promise<void> {
    this.logger.warn('Kafka retry/DLQ foundation is scaffolded only in this phase.');
  }
}
