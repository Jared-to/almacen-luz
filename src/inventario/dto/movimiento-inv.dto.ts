import { IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class MovimientoInventarioDto {

  @IsString()
  almacenId: string;

  @IsString()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  sku: string;

  @IsNumber()
  costoUnit: number;

}
