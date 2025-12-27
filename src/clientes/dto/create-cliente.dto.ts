import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateClienteDto {

  @MinLength(3)
  @IsString()
  nombre: string;

  @MinLength(4)
  @IsString()
  @IsOptional()
  apellido?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  cumpleanios?: string;

  @IsOptional()
  @IsString()
  telefono?: string
}
