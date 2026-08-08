const MAILPIT_URL = `http://localhost:${process.env.MAILPIT_UI_PORT ?? '8025'}`;

interface MailpitMessageSummary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
  Created: string;
}

interface MailpitMessageList {
  messages: MailpitMessageSummary[];
}

interface MailpitMessage {
  Text: string;
}

// Mailpit has no per-recipient filter in its list endpoint, so this fetches
// the full inbox and filters client-side — fine at E2E scale.
async function findLatestMessage(
  recipient: string,
  subjectContains: string,
): Promise<MailpitMessage> {
  const listRes = await fetch(`${MAILPIT_URL}/api/v1/messages`);
  const list = (await listRes.json()) as MailpitMessageList;

  const match = list.messages
    .filter(
      (m) =>
        m.To.some((to) => to.Address === recipient) &&
        m.Subject.includes(subjectContains),
    )
    // Mailpit returns newest-first already, but sort explicitly rather than
    // rely on that ordering staying true.
    .sort(
      (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime(),
    )[0];

  if (!match) {
    throw new Error(
      `no Mailpit message to ${recipient} with subject containing "${subjectContains}"`,
    );
  }

  const messageRes = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
  return (await messageRes.json()) as MailpitMessage;
}

function extractVerificationToken(text: string): string {
  const match = text.match(/verify-email\?token=([0-9a-f]+)/);
  if (!match) {
    throw new Error('no verification token found in the email body');
  }
  return match[1];
}

export async function getLatestVerificationLink(
  recipient: string,
): Promise<string> {
  const message = await findLatestMessage(recipient, 'Verify your email');
  return extractVerificationToken(message.Text);
}
