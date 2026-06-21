import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token for non-browser clients. Browser clients use the HttpOnly refresh cookie.', required: false })
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}
