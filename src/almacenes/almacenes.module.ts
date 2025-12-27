import { Module } from '@nestjs/common';
import { AlmacenesService } from './almacenes.service';
import { AlmacenesController } from './almacenes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Almacen } from './entities/almacen.entity';

@Module({
  controllers: [AlmacenesController],
  providers: [AlmacenesService],
  imports: [
    TypeOrmModule.forFeature([Almacen]),
    
  ],
  exports:[AlmacenesService],
})
export class AlmacenesModule { }
