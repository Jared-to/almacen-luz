import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { InventarioModule } from 'src/inventario/inventario.module';
import { ProductosModule } from 'src/productos/productos.module';
import { AlmacenesModule } from 'src/almacenes/almacenes.module';
import { Producto } from 'src/productos/entities/producto.entity';
import { Almacen } from 'src/almacenes/entities/almacen.entity';
import { ClientesModule } from 'src/clientes/clientes.module';
import { VentaListener } from './listeners/venta.listner';
import { NotificacionesModule } from 'src/notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, DetalleVenta, Producto, Almacen]),
    AuthModule,
    InventarioModule,
    ProductosModule,
    AlmacenesModule,
    ClientesModule,
    NotificacionesModule
  ],
  controllers: [VentasController],
  providers: [VentasService, VentaListener],
  exports: [TypeOrmModule, VentasService]
})
export class VentasModule { }
