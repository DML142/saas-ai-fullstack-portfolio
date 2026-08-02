import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from 'generated/prisma/enums';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.PREMIUM })
  @IsEnum(Role)
  role: Role;
}
