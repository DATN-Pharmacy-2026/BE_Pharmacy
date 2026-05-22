import { Global, Module } from '@nestjs/common';
import { CommercePrismaService } from './commerce-prisma.service';

@Global()
@Module({
  providers: [CommercePrismaService],
  exports: [CommercePrismaService],
})
export class CommercePrismaModule {}
