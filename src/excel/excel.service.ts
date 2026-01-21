import { Injectable, NotFoundException, Type } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import * as fs from 'fs'; // Importar el módulo fs
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, DataSource, QueryRunner, Repository } from 'typeorm';
import { Inventario } from 'src/inventario/entities/inventario.entity';
import { Almacen } from 'src/almacenes/entities/almacen.entity';
import { User } from 'src/auth/entities/user.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Categoria } from 'src/categorias/entities/categoria.entity';
import { inventarioInicial } from 'src/inventario/entities/inventario-inicial.entity';
import { MovimientosAlmacenService } from 'src/inventario/service/movimientos-almacen.service';
import { ProductosService } from 'src/productos/productos.service';
import * as ExcelJS from 'exceljs';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Gasto } from 'src/gastos/entities/gasto.entity';
import { InventarioService } from 'src/inventario/inventario.service';

@Injectable()
export class ExcelService {
  constructor(

    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,

    private readonly productoService: ProductosService,

    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,

    @InjectRepository(Almacen)
    private readonly almacenRepository: Repository<Almacen>,

    private readonly movimientosService: MovimientosAlmacenService,

    private readonly inventarioService: InventarioService,


    private readonly connection: DataSource,
  ) { }


  async procesarExcel(file: Express.Multer.File, usuarioResponsable: User) {
    const queryRunner: QueryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const filePath = file.path;
      const buffer = await fs.promises.readFile(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      const sheetName = workbook.SheetNames[0]; // Procesar solo la primera hoja
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error('El archivo Excel no contiene datos.');
      }

      const categoriasMap = new Map<string, Categoria>();
      const productosMap = new Map<string, Producto>();
      const almacenesMap = new Map<string, Almacen>();

      const categoriasExistentes = await this.categoriaRepository.find();
      const productosExistentes = await this.productoRepository.find({ relations: ['categoria'] });
      const almacenesExistentes = await this.almacenRepository.find();

      categoriasExistentes.forEach((categoria) =>
        categoriasMap.set(categoria.nombre.toLowerCase(), categoria)
      );

      productosExistentes.forEach((producto) =>
        productosMap.set(producto.nombre.toLowerCase(), producto)
      );


      almacenesExistentes.forEach((almacen) =>
        almacenesMap.set(almacen.nombre.toLowerCase(), almacen)
      );

      const errores: string[] = [];
      let nextIncrement = productosExistentes.length + 1;

      for (const [index, row] of jsonData.entries()) {

        try {
          const categoriaNombre = row['Categoria'].toLowerCase().trim();
          const nombre = row['Producto'].toLowerCase().trim();
          const cantidad = Number(row['Cantidad']);
          const unidadMedida = row['unidad_medida'];
          const sku = (row['Codigo_barras']);
          const precioVenta = Number(row['Precio']);
          const precioVentaMin = Number(row['Precio Min Venta']);
          const precioCompra = Number(row['Precio Compra']);
          const almacenNombre = (row['Almacen']).toLowerCase().trim();
          const rawFecha = (row['Fecha Expiracion']);

          let fechaExpiracion: Date | null = null;

          if (typeof rawFecha === 'number') {
            const parsed = XLSX.SSF.parse_date_code(rawFecha);
            fechaExpiracion = new Date(parsed.y, parsed.m - 1, parsed.d);
          } else if (typeof rawFecha === 'string') {
            fechaExpiracion = new Date(rawFecha);
          }

          let almacen = almacenesMap.get(almacenNombre);

          if (!almacen) {
            almacen = queryRunner.manager.create(Almacen, {
              nombre: row['Almacen'],
              descripcion: `Almacen generado automáticamente (${row['Almacen']})`,
            });
            almacen = await queryRunner.manager.save(Almacen, almacen);
            almacenesMap.set(almacenNombre, almacen);
          }

          let categoria = categoriasMap.get(categoriaNombre);
          if (!categoria) {
            categoria = queryRunner.manager.create(Categoria, {
              nombre: row['Categoria'],
              descripcion: `Categoría generada automáticamente (${row['Categoria']})`,
            });
            categoria = await queryRunner.manager.save(Categoria, categoria);
            categoriasMap.set(categoriaNombre, categoria);
          }

          let producto = productosMap.get(nombre);


          if (!producto) {

            nextIncrement++; // Incrementar para el siguiente producto
            producto = await this.productoService.createProductoExcel({
              nombre: nombre,
              unidad_medida: unidadMedida,
              precio_venta: precioVenta.toFixed(2),
              categoriaId: categoria.id,
              stock: cantidad.toFixed(2),
              sku: String(sku),
              almacen: almacen.id,
              fechaExpiracion,
              precio_compra: precioCompra.toFixed(2),
              precio_min_venta: precioVentaMin.toFixed(2),
            }, queryRunner);
            console.log(producto);
            productosMap.set(nombre, producto);
          }

        } catch (error) {

          errores.push(`Error en la fila ${index + 1}: ${error.message}`);
          continue; // Continúa con la siguiente fila.
        }
      }

      await queryRunner.commitTransaction();
      return {
        message: 'Datos procesados correctamente desde el Excel.',
        errores,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Error al procesar el archivo: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async generarReporteVentas(ventas: Venta[]) {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const workbook = new ExcelJS.Workbook();

    // 📘 Hoja 1: Resumen General
    const hojaResumen = workbook.addWorksheet('Resumen Ventas');

    // 📗 Hoja 2: Detalle de Ventas
    const hojaDetalle = workbook.addWorksheet('Detalle Ventas');

    // 🎨 Estilos
    const estiloTitulo: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    const estiloEncabezado: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const estiloDato: Partial<ExcelJS.Style> = {
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
      alignment: { vertical: 'middle' },
    };

    const estiloAnulado: Partial<ExcelJS.Style> = {
      ...estiloDato,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8D7DA' } },
      font: { color: { argb: 'A94442' } },
    };

    const estiloResumen: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    const aplicarEstilo = (cell: ExcelJS.Cell, estilo: Partial<ExcelJS.Style>) => {
      if (estilo.font) cell.font = estilo.font;
      if (estilo.alignment) cell.alignment = estilo.alignment;
      if (estilo.border) cell.border = estilo.border;
      if (estilo.fill) cell.fill = estilo.fill;
    };

    // 🧾 Título hoja 1
    hojaResumen.mergeCells('A1:G1');
    hojaResumen.getCell('A1').value = `REPORTE GENERAL DE VENTAS - Fecha: ${fechaHoy}`;
    aplicarEstilo(hojaResumen.getCell('A1'), estiloTitulo);

    hojaResumen.addRow([]);

    // 🧮 Totales
    let totalEfectivo = 0;
    let totalQR = 0;
    let totalAnuladas = 0;

    for (const v of ventas) {
      if (!v.estado) {
        totalAnuladas += v.total;
        continue;
      }
      if (v.tipo_pago.toLowerCase() === 'efectivo') totalEfectivo += v.total;
      else if (v.tipo_pago.toLowerCase() === 'qr') totalQR += v.total;
      else if (v.tipo_pago.toLowerCase() === 'qr-efectivo') {
        totalQR += v.montoQR ?? 0;
        totalEfectivo += v.montoEfectivo ?? 0;
      }
    }

    hojaResumen.mergeCells('A3:G3');
    hojaResumen.getCell('A3').value = `Total Ventas en Efectivo: Bs. ${totalEfectivo.toFixed(2)}`;
    aplicarEstilo(hojaResumen.getCell('A3'), estiloResumen);

    hojaResumen.mergeCells('A4:G4');
    hojaResumen.getCell('A4').value = `Total Ventas en QR: Bs. ${totalQR.toFixed(2)}`;
    aplicarEstilo(hojaResumen.getCell('A4'), estiloResumen);

    hojaResumen.mergeCells('A5:G5');
    hojaResumen.getCell('A5').value = `Total Ventas Anuladas: Bs. ${totalAnuladas.toFixed(2)}`;
    aplicarEstilo(hojaResumen.getCell('A5'), estiloResumen);

    hojaResumen.addRow([]);
    hojaResumen.addRow([]);

    // 📋 Encabezado del resumen
    const encabezadosResumen = [
      'Codigo',
      'Cliente',
      'Vendedor',
      'Fecha',
      'Subtotal',
      'Descuento',
      'Total',
      'Método de Pago',
    ];

    const rowEncabezadoResumen = hojaResumen.addRow(encabezadosResumen);
    rowEncabezadoResumen.eachCell(cell => aplicarEstilo(cell, estiloEncabezado));

    // 🧩 Datos generales
    for (const venta of ventas) {
      const fecha = new Date(venta.fecha);
      const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${fecha.getFullYear()} ${fecha
          .getHours()
          .toString()
          .padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;

      const fila = [
        venta.codigo,
        venta.nombreCliente,
        venta.vendedor.fullName,
        fechaFormateada,
        venta.subtotal,
        venta.descuento,
        venta.total,
        venta.tipo_pago,
      ];

      const row = hojaResumen.addRow(fila);
      row.eachCell(cell =>
        aplicarEstilo(cell, venta.estado ? estiloDato : estiloAnulado)
      );
    }

    hojaResumen.columns = [
      { width: 25 },
      { width: 25 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
    ];

    // 🧾 Título hoja 2
    hojaDetalle.mergeCells('A1:F1');
    hojaDetalle.getCell('A1').value = `DETALLE DE VENTAS - Fecha: ${fechaHoy}`;
    aplicarEstilo(hojaDetalle.getCell('A1'), estiloTitulo);
    hojaDetalle.addRow([]);

    // 📋 Encabezado detalle
    const encabezadosDetalle = [
      'Código Venta',
      'Producto',
      'Categoría',
      'Cantidad',
      'Precio',
      'Subtotal',
    ];
    const rowEncabezadoDetalle = hojaDetalle.addRow(encabezadosDetalle);
    rowEncabezadoDetalle.eachCell(cell => aplicarEstilo(cell, estiloEncabezado));

    // 📦 Detalles de productos
    for (const venta of ventas) {
      for (const det of venta.detalles) {

        const fila = [
          venta.codigo,
          det.nombreProducto,
          det.inventario?.product?.categoria?.nombre,
          det.cantidad,
          det.precio,
          det.subtotal,
        ];
        const row = hojaDetalle.addRow(fila);
        row.eachCell(cell =>
          aplicarEstilo(cell, venta.estado ? estiloDato : estiloAnulado)
        );
      }
    }

    hojaDetalle.columns = [
      { width: 15 },
      { width: 30 },
      { width: 20 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
    ];

    // 💾 Guardar archivo
    const filePath = `./reporte_ventas_${fechaHoy}.xlsx`;
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  async generarReporteGastos(gastos: Gasto[]) {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Gastos');

    const estiloTitulo = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'C0504D' }
      },
      alignment: {
        horizontal: 'center' as ExcelJS.Alignment['horizontal'],
        vertical: 'middle' as ExcelJS.Alignment['vertical']
      }
    };

    const estiloTotal = {
      font: { bold: true, size: 12 },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'F4CCCC' }
      },
      alignment: {
        horizontal: 'center' as ExcelJS.Alignment['horizontal'],
        vertical: 'middle' as ExcelJS.Alignment['vertical']
      }
    };

    const estiloEncabezado = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'C0504D' }
      },
      alignment: {
        horizontal: 'center' as ExcelJS.Alignment['horizontal'],
        vertical: 'middle' as ExcelJS.Alignment['vertical']
      },
      border: {
        top: { style: 'thin' as ExcelJS.BorderStyle },
        bottom: { style: 'thin' as ExcelJS.BorderStyle },
        left: { style: 'thin' as ExcelJS.BorderStyle },
        right: { style: 'thin' as ExcelJS.BorderStyle }
      }
    };

    const estiloDato = {
      border: {
        top: { style: 'thin' as ExcelJS.BorderStyle },
        bottom: { style: 'thin' as ExcelJS.BorderStyle },
        left: { style: 'thin' as ExcelJS.BorderStyle },
        right: { style: 'thin' as ExcelJS.BorderStyle }
      },
      alignment: {
        vertical: 'middle' as ExcelJS.Alignment['vertical']
      }
    };

    function aplicarEstilo(celda: ExcelJS.Cell, estilo: any) {
      if (estilo.font) celda.font = estilo.font;
      if (estilo.fill) celda.fill = estilo.fill;
      if (estilo.alignment) celda.alignment = estilo.alignment;
      if (estilo.border) celda.border = estilo.border;
    }

    // Título
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = `REPORTE DE GASTOS - Fecha: ${fechaHoy}`;
    worksheet.getCell('A1').style = estiloTitulo;

    // Totales
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const totalQR = gastos
      .filter(g => g.tipo_pago.toLowerCase() === 'qr')
      .reduce((sum, g) => sum + g.monto, 0);
    const totalEfectivo = gastos
      .filter(g => g.tipo_pago.toLowerCase() === 'efectivo')
      .reduce((sum, g) => sum + g.monto, 0);

    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').value = `Total de Gastos: Bs. ${totalGastos.toFixed(2)}`;
    worksheet.getCell('A3').style = estiloTotal;

    worksheet.mergeCells('A4:F4');
    worksheet.getCell('A4').value = `Total Pagado por QR: Bs. ${totalQR.toFixed(2)}`;
    worksheet.getCell('A4').style = estiloTotal;

    worksheet.mergeCells('A5:F5');
    worksheet.getCell('A5').value = `Total Pagado en Efectivo: Bs. ${totalEfectivo.toFixed(2)}`;
    worksheet.getCell('A5').style = estiloTotal;

    // Encabezados
    worksheet.addRow([]);
    const encabezados = ['#', 'Fecha', 'Glogsa', 'Descripción', 'Monto', 'Categoria', 'Tipo de Pago', 'Responsable'];
    const encabezadoRow = worksheet.addRow(encabezados);
    encabezadoRow.eachCell((cell) => {
      cell.style = estiloEncabezado;
    });

    // Datos
    for (const gasto of gastos) {
      const fecha = new Date(gasto.fecha);
      const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()} ${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;

      const row = worksheet.addRow([
        gasto.codigo,
        fechaFormateada,
        gasto.glosa,
        gasto.detalle,
        gasto.monto,
        gasto.categoria.nombre,
        gasto.tipo_pago,
        gasto.usuario?.fullName || 'N/A',
      ]);
      row.eachCell((cell) => {
        cell.style = estiloDato;
      });
    }

    worksheet.columns = [
      { width: 10 },
      { width: 15 },
      { width: 40 },
      { width: 15 },
      { width: 18 },
      { width: 25 },
      { width: 25 },
      { width: 25 },

    ];

    const filePath = `./reporte_gastos_${fechaHoy}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  async generarReporteInventario(inventario: Inventario[]) {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Ventas');

    const estiloTitulo = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: '4F81BD' }
      },
      alignment: {
        horizontal: 'center' as ExcelJS.Alignment['horizontal'],
        vertical: 'middle' as ExcelJS.Alignment['vertical']
      }
    };

    const estiloEncabezado = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: '4F81BD' }
      },
      alignment: {
        horizontal: 'center' as ExcelJS.Alignment['horizontal'],
        vertical: 'middle' as ExcelJS.Alignment['vertical']
      },
      border: {
        top: { style: 'thin' as ExcelJS.BorderStyle },
        bottom: { style: 'thin' as ExcelJS.BorderStyle },
        left: { style: 'thin' as ExcelJS.BorderStyle },
        right: { style: 'thin' as ExcelJS.BorderStyle }
      }
    };

    const estiloDato = {
      border: {
        top: { style: 'thin' as ExcelJS.BorderStyle },
        bottom: { style: 'thin' as ExcelJS.BorderStyle },
        left: { style: 'thin' as ExcelJS.BorderStyle },
        right: { style: 'thin' as ExcelJS.BorderStyle }
      },
      alignment: {
        vertical: 'middle' as ExcelJS.Alignment['vertical']
      }
    };

    // Título
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `REPORTE DE INVENTARIO - Fecha: ${fechaHoy}`;
    worksheet.getCell('A1').style = estiloTitulo;

    // Encabezados
    const encabezados = [
      '#', 'PRODUCTO', 'MARCA', 'STOCK', 'MEDIDA', 'CATEGORIA', 'ALMACEN', 'COSTO UNIT', 'EXPIRACION'
    ];
    worksheet.addRow([]);
    const encabezadoRow = worksheet.addRow(encabezados);
    encabezadoRow.eachCell((cell) => {
      cell.style = estiloEncabezado;
    });

    // Datos
    inventario.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.product.nombre,
        item.product.marca,
        item.stock,
        item.product.unidad_medida,
        item.product.categoria.nombre,
        item.almacen.nombre,
        item.costoUnit,
        item.fechaExpiracion,
      ]);
      row.eachCell((cell) => {
        cell.style = estiloDato;
      });
    });

    // Ajuste de columnas
    worksheet.columns = [
      { width: 5 },
      { width: 40 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },

    ];

    const filePath = `./reporte_inventario_${fechaHoy}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

async generarReporteMovimientosProducto(
  fechaInicio: string, 
  fechaFin: string, 
  id_inventario: string
) {
  try {
    const fechaHoy = new Date();
    const fechaFormateada = fechaHoy.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const horaFormateada = fechaHoy.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Obtener datos
    const inv = await this.inventarioService.obtenerInfoProducto(id_inventario);
    const movimientos = await this.movimientosService.obtenerMovimientosPorProducto(
      id_inventario, 
      fechaInicio, 
      fechaFin
    );

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Inventarios';
    workbook.created = new Date();

    // Hoja principal
    const worksheet = workbook.addWorksheet('MOVIMIENTOS');
    
    // ===== ESTILOS REUTILIZABLES =====
    const styles = {
      headerMain: {
        font: { bold: true, size: 18, color: { argb: 'FFFFFFFF' }, name: 'Calibri' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: '2E5597' }
        },
        border: {
          top: { style: 'medium' as const, color: { argb: '1F3864' } },
          bottom: { style: 'medium' as const, color: { argb: '1F3864' } },
          left: { style: 'medium' as const, color: { argb: '1F3864' } },
          right: { style: 'medium' as const, color: { argb: '1F3864' } }
        }
      },
      subHeader: {
        font: { bold: true, size: 11, name: 'Calibri' },
        alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'E7EFF7' }
        },
        border: {
          bottom: { style: 'thin' as const, color: { argb: 'B4C6E7' } }
        }
      },
      tableHeader: {
        font: { bold: true, size: 10, color: { argb: 'FFFFFF' }, name: 'Calibri' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: '4472C4' }
        },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFFFFF' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFFFFF' } },
          left: { style: 'thin' as const, color: { argb: 'FFFFFF' } },
          right: { style: 'thin' as const, color: { argb: 'FFFFFF' } }
        }
      },
      dataRowEven: {
        font: { size: 10, name: 'Calibri' },
        alignment: { vertical: 'middle' as const },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'FFFFFF' }
        },
        border: {
          top: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
          bottom: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
          left: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
          right: { style: 'thin' as const, color: { argb: 'D9D9D9' } }
        }
      },
      dataRowOdd: {
        font: { size: 10, name: 'Calibri' },
        alignment: { vertical: 'middle' as const },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'F2F2F2' }
        },
        border: {
          top: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
          bottom: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
          left: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
          right: { style: 'thin' as const, color: { argb: 'D9D9D9' } }
        }
      },
      ingresoCell: {
        font: { bold: true, color: { argb: '107C10' }, size: 10 },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'C6EFCE' }
        }
      },
      salidaCell: {
        font: { bold: true, color: { argb: '9C0006' }, size: 10 },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'FFC7CE' }
        }
      },
      totalPositive: {
        font: { bold: true, color: { argb: '107C10' }, size: 10 },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'E2F0D9' }
        }
      },
      totalNegative: {
        font: { bold: true, color: { argb: '9C0006' }, size: 10 },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'F2DCDB' }
        }
      }
    };

    // ===== ENCABEZADO PRINCIPAL =====
    worksheet.mergeCells('A1', 'I1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REPORTE DE MOVIMIENTOS DE PRODUCTO';
    Object.assign(titulo.style, styles.headerMain);
    titulo.style.font!.size = 20;

    // ===== INFORMACIÓN DEL REPORTE =====
    worksheet.mergeCells('A2', 'I2');
    const infoReporte = worksheet.getCell('A2');
    infoReporte.value = `Generado: ${fechaFormateada} - ${horaFormateada}`;
    infoReporte.style = {
      font: { italic: true, size: 9, color: { argb: '666666' }, name: 'Calibri' },
      alignment: { horizontal: 'right' as const, vertical: 'middle' as const }
    };

    // ===== INFORMACIÓN DEL PRODUCTO =====
    const infoProductoRows = [
      [`Producto:`, inv.product?.nombre || 'Desconocido'],
      [`Código:`, inv.product?.codigo || 'N/A'],
      [`Categoría:`, inv.product?.categoria?.nombre || 'N/A'],
      [`Existencia Actual:`, inv.stock * inv.costoUnit || 0],
      [`Costo Promedio:`, inv.costoUnit ? `${inv.costoUnit.toFixed(2)}` : '$0.00'],
      [`Período:`, `${fechaInicio} al ${fechaFin}`]
    ];

    let rowNum = 4;
    infoProductoRows.forEach(([label, value]) => {
      // Label
      const labelCell = worksheet.getCell(`A${rowNum}`);
      labelCell.value = label;
      labelCell.style = {
        font: { bold: true, size: 10, name: 'Calibri' },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'F2F2F2' }
        },
        border: { right: { style: 'thin' as const, color: { argb: 'D9D9D9' } } }
      };
      
      // Value
      const valueCell = worksheet.getCell(`B${rowNum}`);
      valueCell.value = value;
      valueCell.style = {
        font: { size: 10, name: 'Calibri' }
      };
      
      worksheet.mergeCells(`B${rowNum}`, `C${rowNum}`);
      rowNum++;
    });

    // Espacio antes de la tabla
    const startDataRow = rowNum + 2;

    // ===== ENCABEZADOS DE LA TABLA =====
    const encabezados = [
      { header: 'N°', key: 'numero', width: 6 },
      { header: 'FECHA', key: 'fecha', width: 12 },
      { header: 'REFERENCIA', key: 'referencia', width: 40 },
      { header: 'ALMACÉN', key: 'almacen', width: 25 },
      { header: 'CANTIDAD', key: 'cantidad', width: 12 },
      { header: 'PPP.', key: 'costo', width: 15 },
      { header: 'TOTAL', key: 'total', width: 15 },
      { header: 'TIPO', key: 'tipo', width: 15 },
      { header: 'EXISTENCIA', key: 'existencia', width: 12 }
    ];

    // Agregar encabezados
    const headerRow = worksheet.getRow(startDataRow);
    encabezados.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      Object.assign(cell.style, styles.tableHeader);
    });
    headerRow.height = 25;

    // ===== DATOS DE MOVIMIENTOS =====
    let totalIngresos = 0;
    let totalSalidas = 0;
    let saldoFinal = 0;
    let existenciaAnterior = 0;

    if (movimientos.length > 0) {
      // Calcular existencia inicial (primera existencia - primer movimiento)
      const primerMov = movimientos[0];
      existenciaAnterior = (primerMov.existencia || 0) - 
        (primerMov.tipo.toLowerCase() === 'ingreso' ? primerMov.cantidad : -primerMov.cantidad);
    }

    movimientos.forEach((mov, index) => {
      const currentRowNum = startDataRow + index + 1;
      const row = worksheet.getRow(currentRowNum);
      
      const costoUnit = mov.costoUnit || 0;
      const total = mov.cantidad * costoUnit;
      const esPar = index % 2 === 0;
      
      // Calcular existencia actual
      const existenciaActual = existenciaAnterior + 
        (mov.tipo.toLowerCase() === 'ingreso' ? mov.cantidad : -mov.cantidad);
      
      // Acumular totales
      if (mov.tipo.toLowerCase() === 'ingreso') {
        totalIngresos += total;
      } else {
        totalSalidas += total;
      }
      
      saldoFinal = existenciaActual;

      // Valores de la fila
      const valores = [
        index + 1,
        new Date(mov.fecha).toLocaleDateString('es-ES'),
        mov.descripcion || 'Sin referencia',
        mov.almacen?.nombre || 'Central',
        mov.cantidad,
        costoUnit > 0 ? `${costoUnit.toFixed(2)}` : '$0.00',
        total > 0 ? `${total.toFixed(2)}` : '$0.00',
        mov.tipo.toUpperCase(),
        existenciaActual
      ];

      // Asignar valores y estilos
      valores.forEach((valor, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = valor;
        
        // Estilo base de fila
        const baseStyle = esPar ? styles.dataRowEven : styles.dataRowOdd;
        Object.assign(cell.style, baseStyle);
        
        // Alineaciones específicas
        if (colIndex === 0 || colIndex === 4 || colIndex === 8) {
          cell.alignment = { 
            ...cell.alignment, 
            horizontal: 'center' as const 
          };
        }
        if (colIndex === 5 || colIndex === 6) {
          cell.alignment = { 
            ...cell.alignment, 
            horizontal: 'right' as const 
          };
        }
        
        // Estilo para tipo de movimiento
        if (colIndex === 7) {
          if (mov.tipo.toLowerCase() === 'ingreso') {
            Object.assign(cell.style, styles.ingresoCell);
            cell.alignment = { 
              ...cell.alignment, 
              horizontal: 'center' as const 
            };
          } else {
            Object.assign(cell.style, styles.salidaCell);
            cell.alignment = { 
              ...cell.alignment, 
              horizontal: 'center' as const 
            };
          }
        }
        
        // Estilo para cantidades negativas
        if (colIndex === 4 && mov.tipo.toLowerCase() === 'salida') {
          cell.font = { 
            ...cell.font, 
            color: { argb: '9C0006' } 
          };
        }
      });
      
      row.height = 20;
      
      // Actualizar para siguiente iteración
      existenciaAnterior = existenciaActual;
    });

    // ===== TOTALES =====
    const totalRowNum = startDataRow + movimientos.length + 2;
    
    // Fila de resumen
    if (movimientos.length > 0) {
      const resumenRow = worksheet.getRow(totalRowNum);
      resumenRow.getCell(1).value = 'RESUMEN DEL PERÍODO:';
      resumenRow.getCell(1).style = {
        font: { bold: true, size: 11, name: 'Calibri' },
        fill: { 
          type: 'pattern' as const, 
          pattern: 'solid' as const, 
          fgColor: { argb: 'E7EFF7' } 
        }
      };
      
      // Totales
      const totales = [
        ['Total Ingresos:', totalIngresos, styles.totalPositive],
        ['Total Salidas:', totalSalidas, styles.totalNegative],
        ['Saldo Final:', saldoFinal, { 
          font: { bold: true, size: 11, color: { argb: '1F3864' } },
          fill: { 
            type: 'pattern' as const, 
            pattern: 'solid' as const, 
            fgColor: { argb: 'D9E1F2' } 
          }
        }]
      ];
      
      totales.forEach(([label, valor, estilo], index) => {
        const row = worksheet.getRow(totalRowNum + index + 1);
        
        // Label
        row.getCell(6).value = label as ExcelJS.CellValue;;
        row.getCell(6).style = {
          font: { bold: true, size: 10, name: 'Calibri' },
          alignment: { horizontal: 'right' as const }
        };
        
        // Valor
        row.getCell(7).value = typeof valor === 'number' ? `${valor.toFixed(2)}` : valor as ExcelJS.CellValue;;
        Object.assign(row.getCell(7).style, estilo);
        row.getCell(7).style.alignment = { horizontal: 'right' as const };
        row.getCell(7).style.border = {
          top: { style: 'thin' as const, color: { argb: '1F3864' } },
          bottom: { style: 'thin' as const, color: { argb: '1F3864' } },
          left: { style: 'thin' as const, color: { argb: '1F3864' } },
          right: { style: 'thin' as const, color: { argb: '1F3864' } }
        };
        
        worksheet.mergeCells(`G${totalRowNum + index + 1}`, `H${totalRowNum + index + 1}`);
      });
    }

    // ===== PIE DE PÁGINA =====
    const footerRow = totalRowNum + (movimientos.length > 0 ? 4 : 2);
    worksheet.mergeCells(`A${footerRow}`, `I${footerRow}`);
    const footer = worksheet.getCell(`A${footerRow}`);
    footer.value = `* Reporte generado automáticamente por el Sistema de Inventarios *`;
    footer.style = {
      font: { italic: true, size: 8, color: { argb: '999999' }, name: 'Calibri' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    // ===== CONGELAR PANELES =====
    worksheet.views = [
      { 
        state: 'frozen' as const, 
        xSplit: 0, 
        ySplit: startDataRow, 
        activeCell: `A${startDataRow + 1}` 
      }
    ];

    // ===== AJUSTAR ANCHOS =====
    encabezados.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    // ===== GUARDAR ARCHIVO =====
    const nombreArchivo = `Movimientos_${inv.product?.codigo || 'Producto'}_${fechaInicio.replace(/-/g, '')}_${fechaFin.replace(/-/g, '')}.xlsx`;
    const filePath = `./reportes/${nombreArchivo}`;
    
    // Crear directorio si no existe
    const fs = require('fs');
    const dir = './reportes';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`Reporte generado: ${filePath}`);
    return filePath;

  } catch (error) {
    console.error('Error generando reporte:', error);
    throw error;
  }
}
}