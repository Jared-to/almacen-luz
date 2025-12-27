import {  IsOptional, IsString } from 'class-validator';

export class CreateControlDto {
  @IsString()
  @IsOptional()
  titleMensaje?: string;

  @IsString()
  @IsOptional()
  descripcionMensaje?: string;

}
