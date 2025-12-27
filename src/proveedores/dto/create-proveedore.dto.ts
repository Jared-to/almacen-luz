import { IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateProveedoreDto {


  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsOptional()
  @IsString()
  contacto_principal?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  direccion?: string;

  @IsNotEmpty()
  @IsString()
  ciudad: string;
}
