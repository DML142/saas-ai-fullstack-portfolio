import { Test, TestingModule } from '@nestjs/testing';
import { readdir, stat, unlink } from 'fs/promises';
import { AvatarCleanupService } from './avatar-cleanup.service';
import { PrismaService } from 'src/PrismaService';
import { AVATAR_CLEANUP_GRACE_PERIOD_MS } from './cron.config';

jest.mock('fs/promises');

const mockReaddir = readdir as jest.Mock;
const mockStat = stat as jest.Mock;
const mockUnlink = unlink as jest.Mock;

describe('AvatarCleanupService', () => {
  let service: AvatarCleanupService;
  let prisma: { user: { findMany: jest.Mock } };

  const oldMtime = Date.now() - AVATAR_CLEANUP_GRACE_PERIOD_MS - 1000;
  const freshMtime = Date.now();

  beforeEach(async () => {
    prisma = { user: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarCleanupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AvatarCleanupService>(AvatarCleanupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a file with no matching avatarUrl past the grace period', async () => {
    mockReaddir.mockResolvedValue(['orphan.png']);
    mockStat.mockResolvedValue({ mtimeMs: oldMtime });
    prisma.user.findMany.mockResolvedValue([]);

    await service.cleanupOrphanedAvatars();

    expect(mockUnlink).toHaveBeenCalledWith(
      expect.stringContaining('orphan.png'),
    );
  });

  it('leaves a file referenced by a user alone', async () => {
    mockReaddir.mockResolvedValue(['keep.png']);
    prisma.user.findMany.mockResolvedValue([
      { avatarUrl: '/uploads/avatars/keep.png' },
    ]);

    await service.cleanupOrphanedAvatars();

    expect(mockStat).not.toHaveBeenCalled();
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('leaves a too-recent unreferenced file alone', async () => {
    mockReaddir.mockResolvedValue(['new.png']);
    mockStat.mockResolvedValue({ mtimeMs: freshMtime });
    prisma.user.findMany.mockResolvedValue([]);

    await service.cleanupOrphanedAvatars();

    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('treats a missing upload directory as zero files, not an error', async () => {
    mockReaddir.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    await expect(service.cleanupOrphanedAvatars()).resolves.toBeUndefined();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('logs and swallows an unexpected error instead of throwing', async () => {
    mockReaddir.mockRejectedValue(
      Object.assign(new Error('EACCES'), { code: 'EACCES' }),
    );

    await expect(service.cleanupOrphanedAvatars()).resolves.toBeUndefined();
  });
});
