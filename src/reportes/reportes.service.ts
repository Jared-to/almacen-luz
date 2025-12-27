import { Injectable } from '@nestjs/common';
import { billReports } from './documents/bill.reports';
import { PrinterService } from './helpers/printer.helper';
import { VentasService } from 'src/ventas/ventas.service';
import { billReport } from './documents/bill.report';
import { receiptReport } from './documents/receipt.report'
import { Caja } from 'src/cajas/entities/caja.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Gasto } from 'src/gastos/entities/gasto.entity';
import { Repository } from 'typeorm';
import { cajaReport } from './documents/reportCaja.report';

@Injectable()
export class ReportesService {
  constructor(
    private readonly printer: PrinterService,
    private readonly ventasService: VentasService,
    @InjectRepository(Caja)
    private readonly cajaRepository: Repository<Caja>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
  ) { }

  async obtenerPdfVentas(): Promise<PDFKit.PDFDocument> {
    const docDefinition = billReports();

    return this.printer.createPdf(docDefinition);
  }
  async obtenerPdfVenta(id: string): Promise<PDFKit.PDFDocument> {
    // Busca la venta con el id proporcionado
    const venta = await this.ventasService.findOne(id);

    // Genera el contenido dinámico para el PDF basado en la venta encontrada
    const docDefinition = billReport(venta);

    // Devuelve el PDF generado
    return this.printer.createPdf(docDefinition);
  }
  async obtenerPdfVentaRollo(id: string): Promise<PDFKit.PDFDocument> {
    // Busca la venta con el id proporcionado
    const venta = await this.ventasService.findOne(id);

    // Genera el contenido dinámico para el PDF basado en la venta encontrada
    const docDefinition = receiptReport(venta);

    // Devuelve el PDF generado
    return this.printer.createPdf(docDefinition);
  }

  async obtenerPdfCaja(id: string): Promise<PDFKit.PDFDocument> {
    const caja = await this.cajaRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!caja) {
      throw new Error('No se encontró la caja');
    }

    // Obtener las ventas asociadas a la caja
    const ventas = await this.ventasRepository.find({
      where: { caja: { id } },
      relations: ['vendedor'], // Agrega las relaciones necesarias
    });

    const gastos = await this.gastoRepository.find({
      where: { caja: { id } },
      relations: ['usuario', 'categoria'],
    });

    // Pasar caja y ventas a cajaReport
    const docDefinition = cajaReport(caja, ventas, gastos);

    return this.printer.createPdf(docDefinition);
  }
}
