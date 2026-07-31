import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { PaidTier } from '../billing.config';

export class CheckoutDto {
  @ApiProperty({ enum: ['LITE', 'PRO', 'ULTRA'], example: 'PRO' })
  @IsIn(['LITE', 'PRO', 'ULTRA'])
  tier: PaidTier;
}
