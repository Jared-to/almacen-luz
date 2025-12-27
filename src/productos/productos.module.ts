import { forwardRef, Module } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto } from './entities/producto.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { CategoriasModule } from 'src/categorias/categorias.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { InventarioModule } from 'src/inventario/inventario.module';
import { AlmacenesModule } from 'src/almacenes/almacenes.module';

@Module({
  controllers: [ProductosController],
  providers: [ProductosService],
  imports: [
    TypeOrmModule.forFeature([Producto]),
    CategoriasModule,
    CloudinaryModule,
    forwardRef(() => AlmacenesModule),
    forwardRef(() => InventarioModule),
    forwardRef(() => AuthModule),
  ],
  exports: [ProductosService]
})
export class ProductosModule { }
