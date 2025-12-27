import { IsArray, IsDateString, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";



export class CreateAjusteInventarioDto {
  @IsString()
  almacen_id: string;

  @IsString()
  fecha: string;

  @IsOptional()
  @IsString()
  glosa?: string;

  @IsString()
  id_usuario: string;

  @IsArray()
  detalles: CreateDetalleAjusteDto[];
}

export class CreateDetalleAjusteDto {
  producto_id: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;


  @IsString()
  unidad_medida: string;

  @IsString()
  tipo: string; // Tipo de ajuste (entrada/salida)

  @IsString()
  sku: string;

  @IsDateString()
  fechaExpiracion: string;
}
