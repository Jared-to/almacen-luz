import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedoreDto } from './dto/create-proveedore.dto';
import { UpdateProveedoreDto } from './dto/update-proveedore.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) { }

  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  create(@Body() createProveedoreDto: CreateProveedoreDto) {
    return this.proveedoresService.create(createProveedoreDto);
  }

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  findAll() {
    return this.proveedoresService.findAll();
  }

  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  update(@Param('id') id: string, @Body() updateProveedoreDto: UpdateProveedoreDto) {
    return this.proveedoresService.update(id, updateProveedoreDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  remove(@Param('id') id: string) {
    return this.proveedoresService.remove(id);
  }
}
