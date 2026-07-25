import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import nodemailer from 'nodemailer';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
  });

  async process(job: Job<{ to: string; token: string }>) {
    const { to, token } = job.data;
    if (job.name === 'verification') {
      const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      await this.transporter.sendMail({
        from: 'COS Code <no-reply@coscode.dev>',
        to,
        subject: 'Verify your email',
        html: `...link to ${link}`,
      });
    } else if (job.name === 'reset') {
      const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await this.transporter.sendMail({
        from: 'COS Code <no-reply@coscode.dev>',
        to,
        subject: 'Reset your password',
        html: `...link to ${link}`,
      });
    }
  }
}
