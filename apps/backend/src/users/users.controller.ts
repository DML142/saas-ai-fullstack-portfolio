import {
  Controller,
  Delete,
  FileTypeValidator,
  HttpCode,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import {
  AVATAR_ALLOWED_MIME_TYPE,
  AVATAR_MAX_SIZE_BYTES,
} from './avatar-upload.config';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('me/avatar')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Upload the current user's avatar" })
  @ApiOkResponse({
    description: 'The stored avatar URL',
    schema: { example: { avatarUrl: '/uploads/avatars/abc-123.png' } },
  })
  @ApiBadRequestResponse({
    description:
      'File is not an accepted image type, or exceeds the size limit',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: AVATAR_ALLOWED_MIME_TYPE }),
          new MaxFileSizeValidator({ maxSize: AVATAR_MAX_SIZE_BYTES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const user = req.user as { userId: string };
    const avatarUrl = await this.usersService.updateAvatar(user.userId, file);
    return { avatarUrl };
  }

  @Delete('me/avatar')
  @HttpCode(200)
  @ApiOperation({ summary: "Remove the current user's avatar" })
  @ApiOkResponse({ description: 'Avatar removed (or already unset)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async removeAvatar(@Req() req: Request) {
    const user = req.user as { userId: string };
    await this.usersService.removeAvatar(user.userId);
    return { avatarUrl: null };
  }
}
