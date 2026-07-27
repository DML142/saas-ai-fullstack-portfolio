import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import nodemailer from 'nodemailer';

// Brand palette, hard-coded as hex rather than the site's oklch() tokens:
// email clients (Outlook especially) don't support oklch, so these are the
// sRGB equivalents of --color-bg / --color-ink / --color-cosmic.
const BG = '#0a0a0a';
const CARD = '#141414';
const INK = '#ffffff';
const MUTED = '#a1a1a1';
const COSMIC = '#9b4dff';
const BORDER = '#262626';

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
        text: this.renderText(
          'Confirm your email address to finish setting up your COS Code account.',
          'Verify email',
          link,
        ),
        html: this.renderHtml(
          'Verify your email',
          'Confirm your email address to finish setting up your COS Code account.',
          'Verify email',
          link,
          'If you didn’t create a COS Code account, you can safely ignore this email.',
        ),
      });
    } else if (job.name === 'reset') {
      const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await this.transporter.sendMail({
        from: 'COS Code <no-reply@coscode.dev>',
        to,
        subject: 'Reset your password',
        text: this.renderText(
          'We received a request to reset your COS Code password.',
          'Reset password',
          link,
        ),
        html: this.renderHtml(
          'Reset your password',
          'We received a request to reset your COS Code password. This link expires shortly.',
          'Reset password',
          link,
          'If you didn’t request this, you can safely ignore this email — your password stays the same.',
        ),
      });
    }
  }

  /** Plaintext fallback — improves deliverability and covers clients that
   * refuse HTML. Kept deliberately terse. */
  private renderText(intro: string, action: string, link: string) {
    return `COS Code\n\n${intro}\n\n${action}: ${link}\n`;
  }

  /**
   * Single dark-theme template shared by both emails. Table-based layout with
   * inline styles — the only combination email clients render reliably (no
   * flexbox/grid, no external stylesheets, no oklch).
   */
  private renderHtml(
    heading: string,
    intro: string,
    buttonLabel: string,
    link: string,
    footer: string,
  ) {
    return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${CARD};border:1px solid ${BORDER};border-radius:16px;">
            <tr>
              <td style="padding:32px;font-family:Georgia,'Times New Roman',serif;color:${INK};font-size:20px;letter-spacing:0.5px;">
                COS&nbsp;Code
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;font-family:Georgia,'Times New Roman',serif;color:${INK};font-size:24px;line-height:1.3;">
                ${heading}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;color:${MUTED};font-size:15px;line-height:1.6;">
                ${intro}
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <a href="${link}" style="display:inline-block;background:${COSMIC};color:${INK};text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;">
                  ${buttonLabel}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;font-family:Arial,Helvetica,sans-serif;color:${MUTED};font-size:13px;line-height:1.6;">
                Or paste this link into your browser:<br />
                <a href="${link}" style="color:${COSMIC};word-break:break-all;">${link}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;color:${MUTED};font-size:12px;line-height:1.6;">
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
