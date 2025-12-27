import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.createCategoria(createCategoriaDto);
  }

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  findAll() {
    return this.categoriasService.findAllCategorias();
  }

  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOneCategoria(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  update(@Param('id') id: string, @Body() updateCategoriaDto: UpdateCategoriaDto) {
    return this.categoriasService.updateCategoria(id, updateCategoriaDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(id);
  }
}
