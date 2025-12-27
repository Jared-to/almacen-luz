import { forwardRef, Module } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { inventarioInicial } from './entities/inventario-inicial.entity';
import { Inventario } from './entities/inventario.entity';
import { MovimientoInventario } from './entities/movimiento-inv';
import { MovimientosAlmacenService } from './service/movimientos-almacen.service';
import { ProductosModule } from 'src/productos/productos.module';
import { AjustesInventario } from './service/ajustes-inventario.service';
import { AjusteInventario } from './entities/ajustes-inventario.entity';
import { DetalleAjuste } from './entities/detalle-ajuste.entity';
import { AlmacenesModule } from 'src/almacenes/almacenes.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [InventarioController],
  providers: [InventarioService,MovimientosAlmacenService,AjustesInventario],
  imports: [
    TypeOrmModule.forFeature([inventarioInicial, Inventario, MovimientoInventario,AjusteInventario,DetalleAjuste]),
    forwardRef(() => ProductosModule),
    forwardRef(() => AlmacenesModule),
    forwardRef(() => AuthModule),
    
  ],
  exports:[
    InventarioService,
    MovimientosAlmacenService
  ]
})
export class InventarioModule { }
