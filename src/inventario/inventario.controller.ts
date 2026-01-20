import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { InventarioInicialDto } from './dto/inventario-inicial.dto';
import { AjustesInventario } from './service/ajustes-inventario.service';
import { CreateAjusteInventarioDto } from './dto/ajuste-inventario.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';
import { MovimientosAlmacenService } from './service/movimientos-almacen.service';
import { MovimientoInventario } from './entities/movimiento-inv';
import { AjusteUnitarioDto } from './dto/ajuste-unitario.dto';
import { TraspasoProductoDto } from './dto/traspaso-producto.dto';

@Controller('inventario')
export class InventarioController {
  constructor(
    private readonly inventarioService: InventarioService,
    private readonly ajustesService: AjustesInventario,
    private readonly movimientoInventarioService: MovimientosAlmacenService,

  ) { }

  @Post('modificar-stock')
  @Auth(ValidRoles.admin, ValidRoles.user)
  createInvInicial(@Body() ajusteUnitarioDto: AjusteUnitarioDto) {
    return this.ajustesService.modificarStock(ajusteUnitarioDto);
  }
  @Post('traspaso-producto')
  @Auth(ValidRoles.admin, ValidRoles.user)
  traspasoProducto(@Body() traspasoProducto: TraspasoProductoDto) {
    return this.inventarioService.traspasoProducto(traspasoProducto);
  }

  @Post('cambiar-fecha-expiracion')
  @Auth(ValidRoles.admin)
  cambiarFechaExpiracion(@Body() body: { fechaExpiracion: Date, id_inventario: string }) {
    const { fechaExpiracion, id_inventario } = body
    return this.inventarioService.cambiarFechaExpiracion(id_inventario, fechaExpiracion);
  }


  @Get()
  @Auth(ValidRoles.admin, ValidRoles.user)
  obtenerInventarios() {
    return this.inventarioService.obtenerInventarioCompleto();
  }

  @Get('info/:id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  obtenerInventario(@Param('id') id: string) {
    return this.inventarioService.obtenerInventarioPorProducto(id);
  }

  @Get('stocks-bajos')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async obtenerStocksBajos() {
    return this.inventarioService.obtenerStocksBajos();
  }
  @Get('prox-a-vencer')
  @Auth(ValidRoles.admin)
  async obtenerProductosAVencer() {
    return this.inventarioService.obtenerProductosAVencer();
  }
  @Get('ventas/operaciones/:id_almacen')
  @Auth(ValidRoles.admin, ValidRoles.user)
  obtenerInventarioVenta(@Param('id_almacen') id: string) {
    return this.inventarioService.obtenerInventarioVenta(id);
  }

  @Get('almacen/:id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  obtenerInvAlmacen(@Param('id') id: string) {
    return this.inventarioService.obtenerProductosPorAlmacen(id);
  }



  //------------Movimientos----------------------
  @Get('movimientos/producto')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async obtenerMovimientosPorProducto(
    @Query('inventario_id') inventarioID: string,
    @Query('fechaIn') fechaIn?: string,
    @Query('fechaFn') fechaFn?: string,
  ): Promise<MovimientoInventario[]> {
    // Llamar al servicio para obtener los movimientos del producto
    return this.movimientoInventarioService.obtenerMovimientosPorProducto(
      inventarioID,
      fechaIn,
      fechaFn,
    );
  }

  @Get('movimientos/ultimos')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async obtenerUltimosMovimientos(): Promise<MovimientoInventario[]> {
    // Llamar al servicio para obtener los movimientos del producto
    return this.movimientoInventarioService.obtenerUltimosMovimientos();
  }

}
