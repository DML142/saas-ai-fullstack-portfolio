import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Role } from 'generated/prisma/enums';
import type { Request } from 'express';

describe('AdminController', () => {
  let controller: AdminController;
  let service: {
    listUsers: jest.Mock;
    getUser: jest.Mock;
    updateUserRole: jest.Mock;
    listSubscriptions: jest.Mock;
    cancelSubscription: jest.Mock;
    getStats: jest.Mock;
    getQueues: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      updateUserRole: jest.fn(),
      listSubscriptions: jest.fn(),
      cancelSubscription: jest.fn(),
      getStats: jest.fn(),
      getQueues: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: service }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listUsers delegates the query straight through', async () => {
    const query = { page: 1, limit: 20 };
    await controller.listUsers(query);
    expect(service.listUsers).toHaveBeenCalledWith(query);
  });

  it('getUser delegates the id param', async () => {
    await controller.getUser('u1');
    expect(service.getUser).toHaveBeenCalledWith('u1');
  });

  it('updateUserRole passes the acting user id from the request, not the body', async () => {
    const req = {
      user: { userId: 'admin1', role: Role.ADMIN },
    } as unknown as Request;

    await controller.updateUserRole(req, 'target', { role: Role.PREMIUM });

    expect(service.updateUserRole).toHaveBeenCalledWith(
      'admin1',
      'target',
      Role.PREMIUM,
    );
  });

  it('listSubscriptions delegates the query straight through', async () => {
    const query = { page: 1, limit: 20 };
    await controller.listSubscriptions(query);
    expect(service.listSubscriptions).toHaveBeenCalledWith(query);
  });

  it('cancelSubscription delegates the target userId', async () => {
    await controller.cancelSubscription('u1');
    expect(service.cancelSubscription).toHaveBeenCalledWith('u1');
  });

  it('getStats and getQueues delegate with no arguments', async () => {
    await controller.getStats();
    await controller.getQueues();
    expect(service.getStats).toHaveBeenCalledWith();
    expect(service.getQueues).toHaveBeenCalledWith();
  });
});
