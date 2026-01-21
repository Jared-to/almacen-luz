import { IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { Inventario } from "../entities/inventario.entity";

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

  inventario:Inventario

}
