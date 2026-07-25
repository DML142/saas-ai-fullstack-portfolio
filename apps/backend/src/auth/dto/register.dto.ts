import { IsEmail } from 'class-validator';
import { IsValidPassword } from './is-valid-password.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsValidPassword()
  password: string;
}
