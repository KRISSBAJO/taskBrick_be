import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty({ required: false })
  isPlatformAdmin?: boolean;

  @ApiProperty({ required: false, nullable: true })
  platformAdminLevel?: string | null;

  @ApiProperty({ required: false, type: [String] })
  platformAdminScopes?: string[];
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiPropertyOptional({
    description: 'Deprecated for browsers. Refresh tokens are issued in an HttpOnly cookie.'
  })
  refreshToken?: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiPropertyOptional({
    description: 'Deprecated for browsers. Trusted-device tokens are issued in an HttpOnly cookie.'
  })
  trustedDeviceToken?: string;
}
