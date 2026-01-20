import { forwardRef, Module } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from 'src/inventario/inventario.module';
import { Compra } from './entities/compra.entity';
import { DetalleCompra } from './entities/detalle-compra.entity';
import { ProductosModule } from 'src/productos/productos.module';

@Module({
  controllers: [ComprasController],
  providers: [ComprasService],
  imports: [
    TypeOrmModule.forFeature([
      Compra, DetalleCompra
    ]),
    forwardRef(() => ProductosModule),
    forwardRef(() => InventarioModule),

  ]
})
export class ComprasModule { }
