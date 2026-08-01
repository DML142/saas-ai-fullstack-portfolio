import { Test, TestingModule } from '@nestjs/testing';
import { WebhookEventCleanupService } from './webhook-event-cleanup.service';
import { PrismaService } from 'src/PrismaService';
import { CRON_WEBHOOK_EVENT_RETENTION_DAYS } from './cron.config';

describe('WebhookEventCleanupService', () => {
  let service: WebhookEventCleanupService;
  let prisma: { processedWebhookEvent: { deleteMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { processedWebhookEvent: { deleteMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookEventCleanupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WebhookEventCleanupService>(
      WebhookEventCleanupService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deletes rows older than the retention window', async () => {
    prisma.processedWebhookEvent.deleteMany.mockResolvedValue({ count: 3 });

    await service.cleanupStaleWebhookEvents();

    const { where } =
      prisma.processedWebhookEvent.deleteMany.mock.calls[0][0];
    const cutoff = where.processedAt.lt as Date;
    const expectedCutoff =
      Date.now() - CRON_WEBHOOK_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    expect(cutoff.getTime()).toBeCloseTo(expectedCutoff, -3);
  });

  it('logs and swallows an error instead of throwing', async () => {
    prisma.processedWebhookEvent.deleteMany.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      service.cleanupStaleWebhookEvents(),
    ).resolves.toBeUndefined();
  });
});
