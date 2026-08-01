import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/PrismaService';
import {
  AVATAR_CLEANUP_GRACE_PERIOD_MS,
  CRON_AVATAR_CLEANUP_SCHEDULE,
} from './cron.config';
import { readdir, stat, unlink } from 'fs/promises';
import { AVATAR_UPLOAD_DIR } from 'src/users/avatar-upload.config';
import { join } from 'path';

@Injectable()
export class AvatarCleanupService {
  private readonly logger = new Logger(AvatarCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CRON_AVATAR_CLEANUP_SCHEDULE)
  async cleanupOrphanedAvatars() {
    const startedAt = Date.now();
    this.logger.log('Started avatar cleanup');

    try {
      const deletedCount = await this.deleteOrphanedFiles();
      this.logger.log(
        `Avatar cleanup finished: deleted ${deletedCount} file(s) in ${Date.now() - startedAt}ms`,
      );
    } catch (err) {
      this.logger.error('Avatar cleanup failed', err);
    }
  }

  private async deleteOrphanedFiles(): Promise<number> {
    let filenames: string[];
    try {
      filenames = await readdir(AVATAR_UPLOAD_DIR);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
      throw err;
    }

    const users = await this.prisma.user.findMany({
      where: { avatarUrl: { not: null } },
      select: { avatarUrl: true },
    });
    const referenced = new Set(
      users.map((user) => user.avatarUrl!.split('/').pop()),
    );

    let deletedCount = 0;
    for (const filename of filenames) {
      if (referenced.has(filename)) continue;

      const filePath = join(AVATAR_UPLOAD_DIR, filename);
      const { mtimeMs } = await stat(filePath);
      if (Date.now() - mtimeMs < AVATAR_CLEANUP_GRACE_PERIOD_MS) continue;

      await unlink(filePath);
      deletedCount++;
    }

    return deletedCount;
  }
}
