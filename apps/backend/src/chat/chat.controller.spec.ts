import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UsageLimitGuard } from './guards/usage-limit.guard';
import { ImportWorkspaceDto } from './dto/import-workspace.dto';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: {
    exportWorkspace: jest.Mock;
    importWorkspace: jest.Mock;
  };

  const makeRequest = (userId: string) =>
    ({ user: { userId, role: 'USER' } }) as unknown as Request;

  beforeEach(async () => {
    chatService = {
      exportWorkspace: jest.fn(),
      importWorkspace: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: chatService }],
    })
      .overrideGuard(UsageLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('exportWorkspace', () => {
    it("delegates to the service with the caller's userId from the token", async () => {
      await controller.exportWorkspace(makeRequest('u1'), 'w1');

      expect(chatService.exportWorkspace).toHaveBeenCalledWith('u1', 'w1');
    });
  });

  describe('importWorkspace', () => {
    it("delegates to the service with the caller's userId from the token, not the body", async () => {
      const dto: ImportWorkspaceDto = {
        version: 1,
        name: 'Restored chat',
        messages: [{ role: 'USER', content: 'hi' }],
      };

      await controller.importWorkspace(makeRequest('u1'), dto);

      expect(chatService.importWorkspace).toHaveBeenCalledWith('u1', dto);
    });
  });
});
