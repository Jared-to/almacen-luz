import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateCategoriaDto {

  @IsString()
  @MinLength(4)
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion: string;
}
