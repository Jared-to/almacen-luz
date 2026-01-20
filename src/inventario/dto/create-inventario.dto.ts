import { IsDateString, IsNumber, IsPositive, IsString } from "class-validator";

export class CreateInventarioDto {

  @IsString()
  almacenId: string;

  @IsString()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: any;

  @IsString()
  sku: string;

  @IsDateString()
  fechaExpiracion?: Date;

  @IsNumber()
  costoUnit: number;
}
