import { Module } from '@nestjs/common';
import { CorrelationIdService } from './correlation-id.service';
import { EventIdempotencyService } from './event-idempotency.service';
import { EventPublisherService } from './event-publisher.service';
import { EventSubscriberService } from './event-subscriber.service';
import { KafkaEventBrokerService } from './brokers/kafka-event-broker.service';
import { MemoryEventBrokerService } from './brokers/memory-event-broker.service';
import { RabbitmqEventBrokerService } from './brokers/rabbitmq-event-broker.service';
import { EventErrorClassifierService } from './retry/event-error-classifier.service';
import { EventRetryPolicyService } from './retry/event-retry-policy.service';
import { EventRetrySchedulerService } from './retry/event-retry-scheduler.service';
import { EventDlqService } from './retry/event-dlq.service';
import { EventReplayService } from './retry/event-replay.service';
import { EventPoisonDetectorService } from './retry/event-poison-detector.service';
import { EventFailureVisibilityService } from './retry/event-failure-visibility.service';
import { RabbitmqRetryTopologyService } from './brokers/rabbitmq-retry-topology.service';
import { RabbitmqDlqService } from './brokers/rabbitmq-dlq.service';
import { KafkaRetryDlqService } from './brokers/kafka-retry-dlq.service';
import { MemoryRetryDlqService } from './brokers/memory-retry-dlq.service';

@Module({
  providers: [
    EventPublisherService,
    EventSubscriberService,
    EventIdempotencyService,
    CorrelationIdService,
    RabbitmqEventBrokerService,
    KafkaEventBrokerService,
    MemoryEventBrokerService,
    EventErrorClassifierService,
    EventRetryPolicyService,
    EventRetrySchedulerService,
    EventDlqService,
    EventReplayService,
    EventPoisonDetectorService,
    EventFailureVisibilityService,
    RabbitmqRetryTopologyService,
    RabbitmqDlqService,
    KafkaRetryDlqService,
    MemoryRetryDlqService,
  ],
  exports: [
    EventPublisherService,
    EventSubscriberService,
    EventIdempotencyService,
    CorrelationIdService,
    EventErrorClassifierService,
    EventRetryPolicyService,
    EventRetrySchedulerService,
    EventDlqService,
    EventReplayService,
    EventPoisonDetectorService,
    EventFailureVisibilityService,
    RabbitmqRetryTopologyService,
    RabbitmqDlqService,
    KafkaRetryDlqService,
    MemoryRetryDlqService,
  ],
})
export class EventBusModule {}
