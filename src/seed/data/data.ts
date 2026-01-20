import { CreateAlmacenDto } from "src/almacenes/dto/create-almacen.dto";
import { CreateUserDto } from "src/auth/dto";
import { CreateControlDto } from "src/control/dto/create-control.dto";


export const createUserSeed: CreateUserDto = {
  username: "admin",
  password: "Items@123*",
  fullName: "Items.bo",
  celular: "75915881",
  roles: ["admin"],
  fotoUrl:'https://res.cloudinary.com/dhdxemsr1/image/upload/v1740754107/vqjnmszqdhwhsqdprgwn.jpg'
};
export const createAlmacen: CreateAlmacenDto = {
  nombre: 'Central',
  encargado: 'Administrador',
  ubicacion: 'Central'
};

export const control:CreateControlDto = {
  titleMensaje: 'Sistema caido',
  descripcionMensaje:'desactivado'
};
