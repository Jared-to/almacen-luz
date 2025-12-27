import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { VentasModule } from 'src/ventas/ventas.module';
import { ProductosModule } from 'src/productos/productos.module';
import { ClientesModule } from 'src/clientes/clientes.module';
import { GastosModule } from 'src/gastos/gastos.module';

@Module({
  controllers: [HomeController],
  providers: [HomeService],
  imports: [
    VentasModule,
    ProductosModule,
    ClientesModule,
    GastosModule
  ]
})
export class HomeModule { }
