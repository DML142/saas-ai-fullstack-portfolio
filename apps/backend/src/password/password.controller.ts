import { Body, Controller, Post } from '@nestjs/common';
import { PasswordService } from './password.service';

@Controller('password')
export class PasswordController {
  constructor(private passwordService: PasswordService) {}

  @Post('hash')
  async hash(@Body('text') text: string) {
    return await this.passwordService.hash(text);
  }

  @Post('compare')
  async compare(
    @Body('password') password: string,
    @Body('hash') hash: string,
  ) {
    return await this.passwordService.compare(password, hash);
  }
}
