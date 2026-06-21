import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ required: false })
  trustedDeviceToken?: string;
}
