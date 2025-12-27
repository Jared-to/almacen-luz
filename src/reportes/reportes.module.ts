import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { PrinterService } from './helpers/printer.helper';
import { VentasModule } from 'src/ventas/ventas.module';
import { GastosModule } from 'src/gastos/gastos.module';
import { CajasModule } from 'src/cajas/cajas.module';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService,PrinterService],
  imports:[
    VentasModule,
    GastosModule,
    CajasModule,
  ]
})
export class ReportesModule {}
