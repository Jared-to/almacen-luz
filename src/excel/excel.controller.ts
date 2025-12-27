import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Req, Res, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { FileInterceptor } from '@nestjs/platform-express';

import { Response } from 'express';
import { VentasService } from 'src/ventas/ventas.service';
import { InventarioService } from 'src/inventario/inventario.service';
import { GastosService } from 'src/gastos/gastos.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';
import { User } from 'src/auth/entities/user.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import * as path from 'path';
import * as fs from 'fs';
@Controller('excel')
export class ExcelController {
  constructor(
    private readonly excelService: ExcelService,
    private readonly ventasService: VentasService,
    private readonly gastosService: GastosService,
    private readonly inventarioService: InventarioService,

  ) { }

  @Post('upload-excel-inventario')
  @UseInterceptors(FileInterceptor('file'))
  async excelIncrementarInventario(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      return { message: 'No se ha subido ningún archivo' };
    }

    const user = req.user

    // Llamar al servicio para procesar el archivo Excel
    return this.excelService.procesarExcel(file, user);
  }
  
  @Get('ventas')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async reportVentas(
    @Query('fechaInicio') fechaInicio: string | 'xx',
    @Query('fechaFin') fechaFin: string | 'xx',
    @GetUser() user: User,
    @Res() response: Response) {
    try {
      const ventas = await this.ventasService.findAllDates(fechaInicio, fechaFin, user);

      const filePath = await this.excelService.generarReporteVentas(ventas);

      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader(
        'Content-Disposition',
        'attachment; filename="Reporte-ventas.xlsx"',
      );

      response.download(filePath, 'Reporte-ventas.xlsx', (err) => {
        if (err) {
          console.error('Error al descargar el archivo:', err);
          response.status(500).send('Error al generar el reporte.');
        }
      });
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      response.status(500).send('Error interno del servidor');
    }
  }
  @Get('gastos')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async reportGastos(
    @Query('fechaInicio') fechaInicio: string | 'xx',
    @Query('fechaFin') fechaFin: string | 'xx',
    @GetUser() user: User,
    @Res() response: Response) {
    try {
      const gastos = await this.gastosService.findAllDates(fechaInicio, fechaFin, user);

      const filePath = await this.excelService.generarReporteGastos(gastos);

      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader(
        'Content-Disposition',
        'attachment; filename="Reporte-gastos.xlsx"',
      );

      response.download(filePath, 'Reporte-gastos.xlsx', (err) => {
        if (err) {
          console.error('Error al descargar el archivo:', err);
          response.status(500).send('Error al generar el reporte.');
        }
      });
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      response.status(500).send('Error interno del servidor');
    }
  }

  @Get('producto/:id')
  async reportMovProduct(
    @Param('id') id: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Res() response: Response) {
    try {


      const filePath = await this.excelService.generarReporteMovimientosProducto(fechaInicio, fechaFin, id);

      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader(
        'Content-Disposition',
        'attachment; filename="Reporte-ventas.xlsx"',
      );

      response.download(filePath, 'Reporte-Mov-Producto.xlsx', (err) => {
        if (err) {
          console.error('Error al descargar el archivo:', err);
          response.status(500).send('Error al generar el reporte.');
        }
      });
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      response.status(500).send('Error interno del servidor');
    }
  }
  @Get('inventario')
  async reporteInventario(
    @Res() response: Response) {
    try {
      const inventario = await this.inventarioService.find()

      const filePath = await this.excelService.generarReporteInventario(inventario);

      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader(
        'Content-Disposition',
        'attachment; filename="Reporte-inventario.xlsx"',
      );

      response.download(filePath, 'Reporte-ventas.xlsx', (err) => {
        if (err) {
          console.error('Error al descargar el archivo:', err);
          response.status(500).send('Error al generar el reporte.');
        }
      });
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      response.status(500).send('Error interno del servidor');
    }
  }
  @Get('descargar-ejemplo-inventario')
  async descargarExcelIventario(@Res() res: Response) {
    try {
      // Ruta absoluta del archivo en el sistema de archivos
      const filePath = path.join(__dirname, '..', '..', 'static', 'excel-ejemplos', 'inventarioPrew.xlsx');

      // Verificar si el archivo existe
      if (!fs.existsSync(filePath)) {
        throw new HttpException('El archivo no existe', HttpStatus.NOT_FOUND);
      }

      // Configurar los encabezados para la descarga del archivo
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=ejemplo-clientes-excel.xlsx');

      // Enviar el archivo al cliente
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      console.error('Error al descargar el archivo:', error.message);
      throw new HttpException('No se pudo descargar el archivo Excel', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
