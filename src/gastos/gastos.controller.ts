import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { GastosService } from './gastos.service';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { ValidRoles } from 'src/auth/interface/valid-roles';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { Gasto } from './entities/gasto.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('gastos')
export class GastosController {
  constructor(private readonly gastosService: GastosService) { }

  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  create(@Body() createGastoDto: CreateGastoDto) {
    return this.gastosService.create(createGastoDto);
  }

  // @Get()
  // @Auth(ValidRoles.admin, ValidRoles.user)
  // findAll() {
  //   return this.gastosService.findAll();
  // }
  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  async findAllDates(
    @Query('fechaInicio') fechaInicio: string | 'xx',
    @Query('fechaFin') fechaFin: string | 'xx',
    @GetUser() user: User,
  ): Promise<Gasto[]> {

    return this.gastosService.findAllDates(fechaInicio, fechaFin, user);
  }

  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOne(@Param('id') id: string) {
    return this.gastosService.findOne(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  update(@Param('id') id: string, @Body() updateGastoDto: UpdateGastoDto) {
    return this.gastosService.update(id, updateGastoDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  remove(@Param('id') id: string) {
    return this.gastosService.remove(id);
  }
}
