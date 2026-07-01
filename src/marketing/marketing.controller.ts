import { Body, Controller, Get, Post, Req, Version } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateContactRequestDto, CreateDemoRequestDto, MarketingLeadResponseDto } from './dto/marketing-lead.dto';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Marketing lead intake readiness check' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        notifyEmailConfigured: { type: 'boolean' },
        confirmationsEnabled: { type: 'boolean' }
      }
    }
  })
  status() {
    return this.marketingService.status();
  }

  @Post('contact')
  @Version('1')
  @ApiOperation({ summary: 'Submit a public contact request' })
  @ApiCreatedResponse({ type: MarketingLeadResponseDto })
  createContact(@Body() dto: CreateContactRequestDto, @Req() request: Request) {
    return this.marketingService.createContact(dto, this.requestMeta(request));
  }

  @Post('demo')
  @Version('1')
  @ApiOperation({ summary: 'Submit a public book-a-demo request' })
  @ApiCreatedResponse({ type: MarketingLeadResponseDto })
  createDemo(@Body() dto: CreateDemoRequestDto, @Req() request: Request) {
    return this.marketingService.createDemo(dto, this.requestMeta(request));
  }

  private requestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')
    };
  }
}
