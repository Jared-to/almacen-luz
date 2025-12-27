import { IsArray, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(
    /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'The password must have a Uppercase, lowercase letter and a number'
  })
  password: string;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsString()
  @MinLength(1)
  fotoUrl: string;

  @IsString()
  @MinLength(7)
  celular: string;

  @IsArray()
  roles: string[]

  @IsUUID()
  @IsOptional()
  almacen?: string;

}