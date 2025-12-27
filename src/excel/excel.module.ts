import { Module } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { ExcelController } from './excel.controller';
import { ProductosModule } from 'src/productos/productos.module';
import { CategoriasModule } from 'src/categorias/categorias.module';
import { AlmacenesModule } from 'src/almacenes/almacenes.module';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventario } from 'src/inventario/entities/inventario.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Almacen } from 'src/almacenes/entities/almacen.entity';
import { InventarioModule } from 'src/inventario/inventario.module';
import { VentasModule } from 'src/ventas/ventas.module';
import { GastosModule } from 'src/gastos/gastos.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ExcelController],
  providers: [ExcelService],
  imports:[
    TypeOrmModule.forFeature([Inventario, Producto, Almacen]),
    MulterModule.register({
      dest: './uploads', // Directorio donde se almacenan temporalmente los archivos
    }),
    ProductosModule,CategoriasModule,AlmacenesModule,
    InventarioModule,
    VentasModule,
    GastosModule,
    AuthModule
  ],

})
export class ExcelModule {}
