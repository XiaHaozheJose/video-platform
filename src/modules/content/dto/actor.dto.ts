import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActorDto {
  @ApiProperty({ description: '演员名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '头像' })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateActorDto extends CreateActorDto {} 