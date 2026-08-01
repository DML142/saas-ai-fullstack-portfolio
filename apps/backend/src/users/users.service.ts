import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/PrismaService';
import { AVATAR_UPLOAD_DIR, avatarFilenameFor } from './avatar-upload.config';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async deleteAvatarFile(avatarUrl: string) {
    const filename = avatarUrl.split('/').pop();
    if (!filename) return;
    try {
      await unlink(join(AVATAR_UPLOAD_DIR, filename));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new InternalServerErrorException('Failed to remove old avatar');
      }
    }
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await mkdir(AVATAR_UPLOAD_DIR, { recursive: true });

    const filename = avatarFilenameFor(userId, file.mimetype);
    await writeFile(join(AVATAR_UPLOAD_DIR, filename), file.buffer);

    if (user.avatarUrl) {
      await this.deleteAvatarFile(user.avatarUrl);
    }

    const avatarUrl = `/uploads/avatars/${filename}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return avatarUrl;
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.avatarUrl) return;

    await this.deleteAvatarFile(user.avatarUrl);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
  }
}
