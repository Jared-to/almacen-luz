import { IsDateString, IsNumber, IsString, IsUUID } from "class-validator";


export class AjusteUnitarioDto {

  @IsUUID()
  productoId: string;

  @IsUUID()
  almacen: string;

  @IsString()
  sku: string;

  @IsNumber()
  cantidad: number;

  @IsString()
  glosa: string;

  @IsString()
  tipo: string;

}