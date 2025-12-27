import { IsNotEmpty, IsString } from "class-validator";

export class CreateCategoriaGastoDto {

  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsString()
  descripcion: string;
}
