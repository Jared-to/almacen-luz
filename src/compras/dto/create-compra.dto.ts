import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";


export class CreateDetalleCompraDto {
  @IsString()
  @IsNotEmpty()
  id_producto: string;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precioCompra: number;

  @IsNumber()
  precioVenta: number;

  @IsNumber()
  precioMinVenta: number;

}
export class CreateCompraDto {

  @IsString()
  almacen: string;


  @IsString()
  glosa: string;

  @IsString()
  fecha?: Date;

  @IsUUID()
  user: string;

  @IsArray()
  @IsOptional()
  detalles: CreateDetalleCompraDto[];
}
