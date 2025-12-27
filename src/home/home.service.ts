import { Injectable } from '@nestjs/common';
import { ClientesService } from 'src/clientes/clientes.service';
import { GastosService } from 'src/gastos/gastos.service';
import { ProductosService } from 'src/productos/productos.service';
import { VentasService } from 'src/ventas/ventas.service';

@Injectable()
export class HomeService {

  constructor(
    private readonly ventasService: VentasService,
    private readonly gastosService: GastosService,
    private readonly clientesService: ClientesService,
    private readonly productosService: ProductosService,


  ) { }

  async infoHomeInicio() {
    const productosMasVendidos = await this.ventasService.getTopUsedProducts();
    const ultimasVentas = await this.ventasService.getLatestSales();
    const proximosCump = await this.clientesService.getUpcomingBirthdays();

    //datos generales
    const numGastos = await this.gastosService.getGastosCount();
    const numVentas = await this.ventasService.getSalesCount();
    const numProducts = await this.productosService.getProductosCount();
    const numClientes = await this.clientesService.getClientesCount();

    return {
      productosMasVendidos,
      ultimasVentas,
      proximosCump,
      generales: {
        numGastos,
        numClientes,
        numProducts,
        numVentas,
      }
    }
  }
}
