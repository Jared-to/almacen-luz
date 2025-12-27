import { forwardRef, Module } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { CajasController } from './cajas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caja } from './entities/caja.entity';
import { AuthModule } from 'src/auth/auth.module';
import { VentasModule } from 'src/ventas/ventas.module';
import { GastosModule } from 'src/gastos/gastos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Caja]),
    AuthModule,
    forwardRef(()=>VentasModule),
    forwardRef(()=>GastosModule) 
  ],
  controllers: [CajasController],
  providers: [CajasService],
  exports:[CajasService,TypeOrmModule]
})
export class CajasModule {}
