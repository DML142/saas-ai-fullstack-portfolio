import { IsNotEmpty, IsString } from 'class-validator';
import { IsValidPassword } from './is-valid-password.decorator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsValidPassword()
  password: string;
}
