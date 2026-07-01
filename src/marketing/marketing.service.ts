import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketingLead, MarketingLeadType } from '@prisma/client';
import { MailDeliveryResult, MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactRequestDto, CreateDemoRequestDto, MarketingLeadResponseDto } from './dto/marketing-lead.dto';

type LeadRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService
  ) {}

  status() {
    return {
      status: 'ok',
      notifyEmailConfigured: Boolean(this.notifyEmail()),
      confirmationsEnabled: this.configService.get<boolean>('marketing.confirmationsEnabled', true)
    };
  }

  async createContact(dto: CreateContactRequestDto, meta: LeadRequestMeta): Promise<MarketingLeadResponseDto> {
    const lead = await this.prisma.marketingLead.create({
      data: {
        type: MarketingLeadType.CONTACT,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        company: this.optional(dto.company),
        phone: this.optional(dto.phone),
        subject: this.optional(dto.subject),
        message: dto.message.trim(),
        source: this.optional(dto.source) ?? 'landing-contact',
        pageUrl: this.optional(dto.pageUrl),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    });

    return this.deliverAndRespond(lead);
  }

  async createDemo(dto: CreateDemoRequestDto, meta: LeadRequestMeta): Promise<MarketingLeadResponseDto> {
    const lead = await this.prisma.marketingLead.create({
      data: {
        type: MarketingLeadType.DEMO,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        company: dto.company.trim(),
        phone: this.optional(dto.phone),
        jobTitle: this.optional(dto.jobTitle),
        teamSize: this.optional(dto.teamSize),
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
        preferredTime: this.optional(dto.preferredTime),
        timezone: this.optional(dto.timezone),
        message: this.optional(dto.message) ?? 'Demo requested from the public website.',
        source: this.optional(dto.source) ?? 'landing-demo',
        pageUrl: this.optional(dto.pageUrl),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    });

    return this.deliverAndRespond(lead);
  }

  private async deliverAndRespond(lead: MarketingLead): Promise<MarketingLeadResponseDto> {
    const delivery = await this.notifyTeam(lead);

    const updated = await this.prisma.marketingLead.update({
      where: { id: lead.id },
      data: {
        mailSent: delivery.sent,
        mailProvider: delivery.provider,
        mailError: delivery.error ?? (delivery.skipped ? 'Mail provider skipped delivery.' : null)
      }
    });

    if (this.configService.get<boolean>('marketing.confirmationsEnabled', true)) {
      void this.sendConfirmation(updated).catch((error) => {
        this.logger.warn(`Marketing confirmation email failed for ${updated.email}: ${this.errorMessage(error)}`);
      });
    }

    return this.toResponse(updated);
  }

  private async notifyTeam(lead: MarketingLead): Promise<MailDeliveryResult> {
    const to = this.notifyEmail();
    if (!to) {
      return {
        sent: false,
        provider: this.configService.get('mail.provider', 'none'),
        skipped: true,
        error: 'MARKETING_NOTIFY_EMAIL is not configured.'
      };
    }

    const label = lead.type === MarketingLeadType.DEMO ? 'Book demo request' : 'Contact request';
    const subject = `[TaskBricks] ${label}: ${lead.name}${lead.company ? ` at ${lead.company}` : ''}`;
    return this.mailService.send({
      to,
      subject,
      text: this.leadText(lead),
      html: this.leadHtml(lead)
    });
  }

  private async sendConfirmation(lead: MarketingLead) {
    const typeLabel = lead.type === MarketingLeadType.DEMO ? 'demo request' : 'message';
    await this.mailService.send({
      to: lead.email,
      subject: `TaskBricks received your ${typeLabel}`,
      text: `Hi ${lead.name},\n\nThanks for reaching out to TaskBricks. We received your ${typeLabel} and our team will follow up.\n\nTaskBricks`,
      html: `<p>Hi ${this.escapeHtml(lead.name)},</p><p>Thanks for reaching out to TaskBricks. We received your ${typeLabel} and our team will follow up.</p><p>TaskBricks</p>`
    });
  }

  private leadText(lead: MarketingLead) {
    const lines = [
      `Type: ${lead.type}`,
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      lead.company ? `Company: ${lead.company}` : undefined,
      lead.phone ? `Phone: ${lead.phone}` : undefined,
      lead.jobTitle ? `Job title: ${lead.jobTitle}` : undefined,
      lead.teamSize ? `Team size: ${lead.teamSize}` : undefined,
      lead.preferredDate ? `Preferred date: ${lead.preferredDate.toISOString().slice(0, 10)}` : undefined,
      lead.preferredTime ? `Preferred time: ${lead.preferredTime}` : undefined,
      lead.timezone ? `Timezone: ${lead.timezone}` : undefined,
      lead.subject ? `Subject: ${lead.subject}` : undefined,
      lead.pageUrl ? `Page: ${lead.pageUrl}` : undefined,
      '',
      lead.message
    ];

    return lines.filter((line) => line !== undefined).join('\n');
  }

  private leadHtml(lead: MarketingLead) {
    const rows = [
      ['Type', lead.type],
      ['Name', lead.name],
      ['Email', lead.email],
      ['Company', lead.company],
      ['Phone', lead.phone],
      ['Job title', lead.jobTitle],
      ['Team size', lead.teamSize],
      ['Preferred date', lead.preferredDate ? lead.preferredDate.toISOString().slice(0, 10) : undefined],
      ['Preferred time', lead.preferredTime],
      ['Timezone', lead.timezone],
      ['Subject', lead.subject],
      ['Page', lead.pageUrl]
    ]
      .filter(([, value]) => Boolean(value))
      .map(([label, value]) => `<tr><td style="padding:6px 12px;color:#6b665c">${label}</td><td style="padding:6px 12px;font-weight:700">${this.escapeHtml(String(value))}</td></tr>`)
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;color:#111">
        <h2 style="margin:0 0 12px">TaskBricks marketing lead</h2>
        <table style="border-collapse:collapse;margin-bottom:16px">${rows}</table>
        <div style="white-space:pre-wrap;border:1px solid #eee5c8;border-radius:12px;padding:14px;background:#fffdf5">${this.escapeHtml(lead.message)}</div>
      </div>
    `;
  }

  private toResponse(lead: MarketingLead): MarketingLeadResponseDto {
    return {
      id: lead.id,
      type: lead.type,
      status: lead.status,
      createdAt: lead.createdAt,
      mailSent: lead.mailSent
    };
  }

  private notifyEmail() {
    return this.configService.get<string>('marketing.notifyEmail')?.trim();
  }

  private optional(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
