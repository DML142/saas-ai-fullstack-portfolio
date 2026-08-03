import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ImportMessageDto {
  @IsIn(['USER', 'ASSISTANT'])
  role: 'USER' | 'ASSISTANT';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  content: string;

  @IsOptional()
  @IsISO8601()
  createdAt?: string;
}

export class ImportWorkspaceDto {
  @IsIn([1])
  version: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ImportMessageDto)
  messages: ImportMessageDto[];
}
