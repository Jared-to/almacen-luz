import { IsNumber, IsString, IsUUID } from "class-validator";


export class TraspasoProductoDto {

  @IsUUID()
  productoId: string;

  @IsUUID()
  almacenId: string;

  @IsUUID()
  inventario_id: string;

  @IsString()
  sku: string;

  @IsNumber()
  cantidad: number;

  @IsString()
  glosa: string;

}