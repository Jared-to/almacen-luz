import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { Venta } from './entities/venta.entity';
import { ValidRoles } from 'src/auth/interface/valid-roles';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) { }

  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  create(@Body() createVentaDto: CreateVentaDto) {

    return this.ventasService.create(createVentaDto);
  }

  // @Get()
  // findAll() {
  //   return this.ventasService.findAll();
  // }

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  async findAllDates(
    @Query('fechaInicio') fechaInicio: string | 'xx',
    @Query('fechaFin') fechaFin: string | 'xx',
    @GetUser() user: User
  ): Promise<Venta[]> {

    return this.ventasService.findAllDates(fechaInicio, fechaFin, user);
  }
  @Get('chart')
  async getDatosChart(@Query('tipo') tipo: 'semana' | 'mes' | 'todo') {
    return this.ventasService.obtenerDatosVentas(tipo || 'semana');
  }

  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(id);
  }

  @Get('edit/:id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOneEdit(@Param('id') id: string) {
    return this.ventasService.findOneEdit(id);
  }
  @Patch(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  update(@Param('id') id: string, @Body() updateVentaDto: UpdateVentaDto) {

    return this.ventasService.update(id, updateVentaDto);
  }

  @Patch('anular/:id/:usuario')
  anular(@Param('id') id: string, @Param('usuario') usuario: string) {
    return this.ventasService.anularVenta(id, usuario);
  }
  @Patch('restaurar/:id')
  restaurar(@Param('id') id: string) {
    return this.ventasService.restaurarVenta(id);
  }

  @Patch('fecha/edit/:id')
  fechaEdit(@Param('id') id: string, @Body() fecha: any) {
    return this.ventasService.updateFecha(id, fecha.fecha);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  remove(@Param('id') id: string) {
    return this.ventasService.remove(id);
  }
}
