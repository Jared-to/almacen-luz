import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { CajaApertura } from './interface/cajaApertura.interface';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';


@Controller('cajas')
export class CajasController {
  constructor(private readonly cajasService: CajasService) { }

  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  create(@Body() cajaApertura: CajaApertura) {
    return this.cajasService.abrirCaja(cajaApertura);
  }

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  findAll() {
    return this.cajasService.findAll();
  }
  @Get('verificar/:id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  verificarEstado(@Param('id') id: string) {
    return this.cajasService.verificarEstadoUltimaCaja(id)
  }

  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  findOne(@Param('id') id: string) {
    return this.cajasService.findOne(id);
  }

  @Patch(':id')
  cerrarCaja(@Param('id') id: string) {
    return this.cajasService.cerrarCaja(id);
  }
  @Patch('reabrir/:id')
  reabrir(@Param('id') id: string) {
    return this.cajasService.reabrirCaja(id);
  }
  @Patch('cerrarCajaEdit/:id')
  cerrarCajaEdit(@Param('id') id: string) {
    return this.cajasService.cerrarCajaEdit(id);
  }
  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  remove(@Param('id') id: string) {
    return this.cajasService.remove(id);
  }
}
