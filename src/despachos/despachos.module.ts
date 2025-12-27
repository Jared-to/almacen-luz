import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleTraspaso } from './entities/detalleTraspaso.entity';
import { InventarioModule } from 'src/inventario/inventario.module';
import { TraspasosController } from './despachos.controller';
import { TraspasosService } from './despachos.service';
import { Traspaso } from './entities/despacho.entity';

@Module({
  controllers: [TraspasosController],
  providers: [TraspasosService],
  imports: [
    TypeOrmModule.forFeature([
      Traspaso,DetalleTraspaso
    ]),
    InventarioModule,
  ]
})
export class TraspasosModule { }
