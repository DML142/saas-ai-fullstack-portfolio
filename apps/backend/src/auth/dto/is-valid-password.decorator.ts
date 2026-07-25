import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

export function IsValidPassword() {
  return applyDecorators(IsString(), MinLength(8), MaxLength(32));
}
