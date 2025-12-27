import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";


export class CreateDetalleTraspasosDto {
  @IsString()
  @IsNotEmpty()
  id_inventario: string;

  @IsNumber()
  cantidad: number;

}
export class CreateTraspasoDto {

  @IsString()
  almacenOrigen: string;

  @IsString()
  almacenDestino: string;

  @IsString()
  glosa: string;

  @IsString()
  fecha?: Date;
  
  @IsUUID()
  user:string;

  @IsArray()
  @IsOptional()
  detalles: CreateDetalleTraspasosDto[];
}
