import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateCategoriaGastoDto } from './dto/create-categoria-gasto.dto';
import { UpdateCategoriaGastoDto } from './dto/update-categoria-gasto.dto';
import { CategoriasGastosService } from './categoria-gastos.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';

@Controller('categoria-gastos')
export class CategoriaGastosController {
  constructor(private readonly categoriaGastosService: CategoriasGastosService) {}

  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  create(@Body() createCategoriaGastoDto: CreateCategoriaGastoDto) {
    return this.categoriaGastosService.create(createCategoriaGastoDto);
  }

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  findAll() {
    return this.categoriaGastosService.findAll();
  }

  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOne(@Param('id') id: string) {
    return this.categoriaGastosService.findOne(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  update(@Param('id') id: string, @Body() updateCategoriaGastoDto: UpdateCategoriaGastoDto) {
    return this.categoriaGastosService.update(id, updateCategoriaGastoDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  remove(@Param('id') id: string) {
    return this.categoriaGastosService.remove(id);
  }
}
