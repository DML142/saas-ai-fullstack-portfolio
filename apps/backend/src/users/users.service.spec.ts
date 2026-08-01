import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { UsersService } from './users.service';
import { PrismaService } from 'src/PrismaService';

jest.mock('fs/promises');

const mockMkdir = mkdir as jest.Mock;
const mockUnlink = unlink as jest.Mock;
const mockWriteFile = writeFile as jest.Mock;

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
    };
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateAvatar', () => {
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-bytes'),
    } as Express.Multer.File;

    it('writes the file and sets avatarUrl when no prior avatar existed', async () => {
      prisma.user.findUnique.mockResolvedValue({ avatarUrl: null });

      const result = await service.updateAvatar('u1', file);

      expect(result).toMatch(/^\/uploads\/avatars\/u1-.+\.png$/);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(result.split('/').pop()!),
        file.buffer,
      );
      expect(mockUnlink).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: result },
      });
    });

    it('deletes the previous file when replacing an existing avatar', async () => {
      prisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/old-file.png',
      });

      await service.updateAvatar('u1', file);

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('old-file.png'),
      );
    });

    it('writes the new file before deleting the old one', async () => {
      prisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/old-file.png',
      });
      const callOrder: string[] = [];
      mockWriteFile.mockImplementation(() => {
        callOrder.push('write');
        return Promise.resolve();
      });
      mockUnlink.mockImplementation(() => {
        callOrder.push('unlink');
        return Promise.resolve();
      });

      await service.updateAvatar('u1', file);

      expect(callOrder).toEqual(['write', 'unlink']);
    });

    it('throws NotFoundException for a missing user and writes nothing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAvatar('missing', file),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('propagates a real disk error deleting the previous file (not ENOENT)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/old-file.png',
      });
      mockUnlink.mockRejectedValue(
        Object.assign(new Error('EACCES'), { code: 'EACCES' }),
      );

      await expect(service.updateAvatar('u1', file)).rejects.toThrow();
    });
  });

  describe('removeAvatar', () => {
    it('deletes the file and clears avatarUrl', async () => {
      prisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/existing.png',
      });

      await service.removeAvatar('u1');

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('existing.png'),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: null },
      });
    });

    it('is a no-op when no avatar is set', async () => {
      prisma.user.findUnique.mockResolvedValue({ avatarUrl: null });

      await service.removeAvatar('u1');

      expect(mockUnlink).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.removeAvatar('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('treats an already-missing file (ENOENT) as success', async () => {
      prisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/gone.png',
      });
      mockUnlink.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      await expect(service.removeAvatar('u1')).resolves.toBeUndefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: null },
      });
    });
  });
});
