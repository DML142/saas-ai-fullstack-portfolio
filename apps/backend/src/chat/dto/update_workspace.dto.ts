import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class updateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
