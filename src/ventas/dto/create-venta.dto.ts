import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDetalleVentaDto {
  @IsString()
  @IsNotEmpty()
  id_inventario: string;


  @IsNumber()
  precio: number;

  @IsNumber()
  cantidad: number;

  @IsString()
  unidad_medida: string;


  @IsNumber()
  subtotal: number;

  @IsString()
  sku: string;

}

export class CreateVentaDto {

  @IsString()
  cliente: string;

  @IsString()
  vendedor: string;

  @IsString()
  cajaId: string;

  @IsString()
  almacen: string;

  @IsString()
  fecha?: Date;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  total: number;

  @IsNumber()
  @IsOptional()
  montoQR?: number;

  @IsNumber()
  @IsOptional()
  montoEfectivo?: number;

  @IsNumber()
  @IsOptional()
  montoRecibido?: number


  @IsNumber()
  descuento: number;

  @IsEnum(['EFECTIVO', 'QR', 'TRANSFERENCIA', 'QR-EFECTIVO'])
  tipo_pago: string;


  @IsArray()
  @IsOptional()
  detalles: CreateDetalleVentaDto[];
}
