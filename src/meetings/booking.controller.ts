import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Version
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BookingService } from './booking.service';
import {
  BookingPageQueryDto,
  CancelPublicBookingDto,
  CreateBookingFormFieldDto,
  CreateBookingPageDto,
  CreatePublicBookingDto,
  PublicBookingPageQueryDto,
  PublicBookingSlotsQueryDto,
  ReschedulePublicBookingDto,
  UpdateBookingFormFieldDto,
  UpdateBookingPageDto
} from './dto/booking.dto';

@ApiTags('meeting-booking')
@Controller('meetings/booking')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MeetingBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('pages')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOkResponse({ description: 'Paginated tenant booking pages' })
  listPages(@CurrentUser() user: AuthenticatedUser, @Query() query: BookingPageQueryDto) {
    return this.bookingService.listPages(user, query);
  }

  @Post('pages')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiCreatedResponse({ description: 'Created booking page' })
  createPage(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBookingPageDto, @Req() request: Request) {
    return this.bookingService.createPage(user, dto, this.getRequestMeta(request));
  }

  @Get('pages/:pageId')
  @Version('1')
  @RequirePermissions('read:meetings')
  getPage(@CurrentUser() user: AuthenticatedUser, @Param('pageId') pageId: string) {
    return this.bookingService.getPage(user, pageId);
  }

  @Patch('pages/:pageId')
  @Version('1')
  @RequirePermissions('manage:meetings')
  updatePage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: UpdateBookingPageDto,
    @Req() request: Request
  ) {
    return this.bookingService.updatePage(user, pageId, dto, this.getRequestMeta(request));
  }

  @Post('pages/:pageId/fields')
  @Version('1')
  @RequirePermissions('manage:meetings')
  createField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: CreateBookingFormFieldDto,
    @Req() request: Request
  ) {
    return this.bookingService.createField(user, pageId, dto, this.getRequestMeta(request));
  }

  @Patch('pages/:pageId/fields/:fieldId')
  @Version('1')
  @RequirePermissions('manage:meetings')
  updateField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateBookingFormFieldDto,
    @Req() request: Request
  ) {
    return this.bookingService.updateField(user, pageId, fieldId, dto, this.getRequestMeta(request));
  }

  @Delete('pages/:pageId/fields/:fieldId')
  @Version('1')
  @RequirePermissions('manage:meetings')
  deleteField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Param('fieldId') fieldId: string,
    @Req() request: Request
  ) {
    return this.bookingService.deleteField(user, pageId, fieldId, this.getRequestMeta(request));
  }

  @Get('requests')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOkResponse({ description: 'Paginated tenant booking requests' })
  listRequests(@CurrentUser() user: AuthenticatedUser, @Query() query: BookingPageQueryDto) {
    return this.bookingService.listRequests(user, query);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null
    };
  }
}

@ApiTags('public-booking')
@Controller('booking/public')
export class PublicBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get(':tenantSlug/page')
  @Version('1')
  @ApiOperation({ summary: 'Resolve a public booking page by tenant slug and path' })
  resolvePage(@Param('tenantSlug') tenantSlug: string, @Query() query: PublicBookingPageQueryDto) {
    return this.bookingService.resolvePublicPage(tenantSlug, query);
  }

  @Get(':tenantSlug/slots')
  @Version('1')
  @ApiOperation({ summary: 'List bookable public slots for a booking page' })
  slots(@Param('tenantSlug') tenantSlug: string, @Query() query: PublicBookingSlotsQueryDto) {
    return this.bookingService.listPublicSlots(tenantSlug, query);
  }

  @Post(':tenantSlug/book')
  @Version('1')
  @ApiOperation({ summary: 'Create a public booking request' })
  book(@Param('tenantSlug') tenantSlug: string, @Body() dto: CreatePublicBookingDto, @Req() request: Request) {
    return this.bookingService.createPublicBooking(tenantSlug, dto, this.getRequestMeta(request));
  }

  @Post('cancel/:token')
  @Version('1')
  @ApiOperation({ summary: 'Cancel a booking using a self-service token' })
  cancel(@Param('token') token: string, @Body() dto: CancelPublicBookingDto, @Req() request: Request) {
    return this.bookingService.cancelPublicBooking(token, dto, this.getRequestMeta(request));
  }

  @Post('reschedule/:token')
  @Version('1')
  @ApiOperation({ summary: 'Reschedule a booking using a self-service token' })
  reschedule(@Param('token') token: string, @Body() dto: ReschedulePublicBookingDto, @Req() request: Request) {
    return this.bookingService.reschedulePublicBooking(token, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null
    };
  }
}
