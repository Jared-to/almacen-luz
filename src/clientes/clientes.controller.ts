import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) { }

  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  create(@Body() createClienteDto: CreateClienteDto) {
    console.log(createClienteDto);
    
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  findAll() {
    return this.clientesService.findAll();
  }

  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async update(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto) {
    const cliente = await this.clientesService.update(id, updateClienteDto);
    return {
      message: 'Cliente actualizado con éxito',
      producto: cliente,
    }
  }

  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async remove(@Param('id') id: string) {
    await this.clientesService.remove(id);
    return {
      message: 'Cliente eliminado con éxito',
    };
  }
}
