import { IsNotEmpty, IsString, IsNumber, IsOptional, MinLength, IsPositive, IsDateString } from 'class-validator';

export class CreateProductoDto {

  @MinLength(2)
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsString()
  unidad_medida: string;

  @IsString()
  stock: string;

  @IsString()
  precio_venta: string;

  @IsString()
  precio_min_venta: string;

  @IsString()
  precio_compra: string;

  @IsDateString()
  fechaExpiracion: Date;

  @IsString()
  @IsNotEmpty()
  categoriaId: string;

  @IsOptional()
  imagen?: string;

  @IsString()
  almacen: string;

  @IsString()
  sku: string;
}
