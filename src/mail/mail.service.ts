import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket, connect as netConnect } from 'node:net';
import { TLSSocket, connect as tlsConnect } from 'node:tls';

type MailProvider = 'none' | 'smtp' | 'resend' | 'sendgrid' | 'ses';
type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};
export type MailDeliveryResult = {
  sent: boolean;
  provider: MailProvider | 'smtp';
  skipped?: boolean;
  error?: string;
};

type SmtpSocket = Socket | TLSSocket;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(message: MailMessage): Promise<MailDeliveryResult> {
    const provider = this.configService.get<MailProvider>('mail.provider', 'none');
    const from = this.configService.get<string>('mail.from') || 'TaskBricks <no-reply@taskbricks.local>';

    try {
      if (provider === 'none') {
        this.logger.log(`Mail provider disabled. ${message.subject} -> ${message.to}`);
        if (this.configService.get<string>('app.nodeEnv') !== 'production') {
          this.logger.log(message.text);
        }
        return { sent: false, provider, skipped: true };
      }

      if (provider === 'smtp' || provider === 'ses') {
        await this.sendSmtp({ ...message, from });
        return { sent: true, provider: provider === 'ses' ? 'smtp' : provider };
      }

      if (provider === 'resend') {
        await this.sendResend({ ...message, from });
        return { sent: true, provider };
      }

      if (provider === 'sendgrid') {
        await this.sendSendGrid({ ...message, from });
        return { sent: true, provider };
      }

      return { sent: false, provider, skipped: true };
    } catch (error) {
      this.logger.error(`Mail delivery failed for ${message.to}: ${this.errorMessage(error)}`);
      return { sent: false, provider, error: this.errorMessage(error) };
    }
  }

  private async sendResend(message: MailMessage & { from: string }) {
    const apiKey = this.configService.get<string>('mail.resendApiKey');
    if (!apiKey) throw new Error('RESEND_API_KEY is required for MAIL_PROVIDER=resend');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html
      })
    });

    if (!response.ok) {
      throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
    }
  }

  private async sendSendGrid(message: MailMessage & { from: string }) {
    const apiKey = this.configService.get<string>('mail.sendgridApiKey');
    if (!apiKey) throw new Error('SENDGRID_API_KEY is required for MAIL_PROVIDER=sendgrid');

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: this.parseAddress(message.from),
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          ...(message.html ? [{ type: 'text/html', value: message.html }] : [])
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`SendGrid returned ${response.status}: ${await response.text()}`);
    }
  }

  private async sendSmtp(message: MailMessage & { from: string }) {
    const host = this.configService.get<string>('mail.smtpHost');
    const port = this.configService.get<number>('mail.smtpPort', 587);
    const secure = this.configService.get<boolean>('mail.smtpSecure', false);
    const user = this.configService.get<string>('mail.smtpUser');
    const password = this.configService.get<string>('mail.smtpPassword');

    if (!host) throw new Error('SMTP_HOST is required for SMTP mail delivery');

    let socket = await this.openSmtpSocket(host, port, secure);
    await this.readSmtpResponse(socket, [220]);
    await this.sendSmtpCommand(socket, `EHLO ${this.smtpHostname()}`, [250]);

    if (!secure) {
      await this.sendSmtpCommand(socket, 'STARTTLS', [220]);
      socket = await this.upgradeToTls(socket, host);
      await this.sendSmtpCommand(socket, `EHLO ${this.smtpHostname()}`, [250]);
    }

    if (user && password) {
      const token = Buffer.from(`\u0000${user}\u0000${password}`).toString('base64');
      await this.sendSmtpCommand(socket, `AUTH PLAIN ${token}`, [235]);
    }

    const fromEmail = this.parseAddress(message.from).email;
    await this.sendSmtpCommand(socket, `MAIL FROM:<${fromEmail}>`, [250]);
    await this.sendSmtpCommand(socket, `RCPT TO:<${message.to}>`, [250, 251]);
    await this.sendSmtpCommand(socket, 'DATA', [354]);
    await this.sendSmtpCommand(socket, `${this.formatSmtpMessage(message)}\r\n.`, [250]);
    await this.sendSmtpCommand(socket, 'QUIT', [221]);
    socket.end();
  }

  private openSmtpSocket(host: string, port: number, secure: boolean) {
    return new Promise<SmtpSocket>((resolve, reject) => {
      const socket = secure
        ? tlsConnect({ host, port, servername: host }, () => resolve(socket))
        : netConnect({ host, port }, () => resolve(socket));
      socket.once('error', reject);
      socket.setTimeout(30000, () => {
        socket.destroy(new Error('SMTP connection timed out'));
      });
    });
  }

  private upgradeToTls(socket: SmtpSocket, host: string) {
    return new Promise<SmtpSocket>((resolve, reject) => {
      const tlsSocket = tlsConnect({ socket, servername: host }, () => resolve(tlsSocket));
      tlsSocket.once('error', reject);
      tlsSocket.setTimeout(30000, () => {
        tlsSocket.destroy(new Error('SMTP TLS upgrade timed out'));
      });
    });
  }

  private async sendSmtpCommand(socket: SmtpSocket, command: string, expectedCodes: number[]) {
    socket.write(`${command}\r\n`);
    return this.readSmtpResponse(socket, expectedCodes);
  }

  private readSmtpResponse(socket: SmtpSocket, expectedCodes: number[]) {
    return new Promise<string>((resolve, reject) => {
      let buffer = '';
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        const last = lines.at(-1);
        if (!last || !/^\d{3} /.test(last)) return;

        socket.off('data', onData);
        socket.off('error', onError);
        const code = Number.parseInt(last.slice(0, 3), 10);
        if (!expectedCodes.includes(code)) {
          reject(new Error(`Unexpected SMTP response ${code}: ${buffer.trim()}`));
          return;
        }
        resolve(buffer.trim());
      };
      const onError = (error: Error) => {
        socket.off('data', onData);
        reject(error);
      };
      socket.on('data', onData);
      socket.once('error', onError);
    });
  }

  private formatSmtpMessage(message: MailMessage & { from: string }) {
    const headers = [
      `From: ${message.from}`,
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8'
    ];
    const body = message.html ?? `<pre>${this.escapeHtml(message.text)}</pre>`;
    return `${headers.join('\r\n')}\r\n\r\n${body}`.replace(/\r?\n\./g, '\r\n..');
  }

  private parseAddress(value: string) {
    const match = value.match(/^(.*)<([^>]+)>$/);
    if (!match) return { email: value.trim() };
    return {
      name: match[1].trim().replace(/^"|"$/g, '') || undefined,
      email: match[2].trim()
    };
  }

  private smtpHostname() {
    return this.configService.get<string>('app.publicApiUrl')?.replace(/^https?:\/\//, '') ?? 'taskbricks.local';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown mail error';
  }
}
