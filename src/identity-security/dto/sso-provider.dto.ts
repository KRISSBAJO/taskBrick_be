import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

const providerTypes = ['GOOGLE', 'MICROSOFT', 'OIDC', 'SAML'] as const;
const providerStatuses = ['ACTIVE', 'DISABLED'] as const;

export class UpsertSsoProviderDto {
  @ApiProperty({ enum: providerTypes })
  @IsIn(providerTypes)
  type!: (typeof providerTypes)[number];

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ enum: providerStatuses })
  @IsOptional()
  @IsIn(providerStatuses)
  status?: (typeof providerStatuses)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  issuerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  authorizationUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  tokenUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  userInfoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  buttonLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  jitProvisioningEnabled?: boolean;
}

export class UpdateTenantLoginPolicyDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(['PASSWORD', 'GOOGLE', 'MICROSOFT', 'OIDC', 'SAML'], { each: true })
  allowedLoginMethods?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ssoRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  domainDiscoveryEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  trustedDeviceTtlDays?: number;
}

export class SsoStartQueryDto {
  @ApiProperty()
  @IsString()
  tenantSlug!: string;

  @ApiProperty()
  @IsString()
  providerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;
}

export class SsoCallbackDto {
  @ApiProperty()
  @IsString()
  state!: string;

  @ApiProperty()
  @IsString()
  code!: string;
}
