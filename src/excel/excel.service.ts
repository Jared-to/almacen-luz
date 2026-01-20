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

    const estiloTotal = {
      font: { bold: true, size: 12 },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'C6EFCE' }
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
    const estiloAnulado = {
      ...estiloDato,
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8D7DA' }, // Rojo claro
      },
      font: { color: { argb: 'A94442' } }, // Texto rojo oscuro
    };

    function aplicarEstilo(cell, estilo) {
      Object.assign(cell, {
        font: estilo.font,
        alignment: estilo.alignment,
        border: estilo.border,
        fill: estilo.fill,
      });
    }
    // Título
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `REPORTE DE VENTAS - Fecha: ${fechaHoy}`;
    worksheet.getCell('A1').style = estiloTitulo;

    // Total de ventas
    // Totales generales
    const totalVentas = ventas
      .filter(v => v.estado === true)
      .reduce((sum, v) => sum + v.total, 0);

    let totalQR = ventas
      .filter(v => v.tipo_pago.toLowerCase() === 'qr' && v.estado === true)
      .reduce((sum, v) => sum + v.total, 0);
    let totalEfectivo = ventas
      .filter(v => v.tipo_pago.toLowerCase() === 'efectivo' && v.estado === true)
      .reduce((sum, v) => sum + v.total, 0);

    for (const element of ventas) {
      if (element.tipo_pago == 'QR-EFECTIVO' && element.estado === true) {
        totalQR += element.montoQR;
        totalEfectivo += element.montoEfectivo;
      }
    }

    // Mostrar total general
    worksheet.mergeCells('A3:H3');
    worksheet.getCell('A3').value = `Total de Ventas: Bs. ${totalVentas.toFixed(2)}`;
    worksheet.getCell('A3').style = estiloTotal;

    // Total QR
    worksheet.mergeCells('A4:H4');
    worksheet.getCell('A4').value = `Total Pagado por QR: Bs. ${totalQR.toFixed(2)}`;
    worksheet.getCell('A4').style = estiloTotal;

    // Total Efectivo
    worksheet.mergeCells('A5:H5');
    worksheet.getCell('A5').value = `Total Pagado en Efectivo: Bs. ${totalEfectivo.toFixed(2)}`;
    worksheet.getCell('A5').style = estiloTotal;


    // Encabezados
    const encabezados = [
      '#', 'Fecha', 'Cliente', 'Vendedor', 'Subtotal', 'Descuento', 'Total', 'Metodo de Pago'
    ];
    worksheet.addRow([]);
    const encabezadoRow = worksheet.addRow(encabezados);
    encabezadoRow.eachCell((cell) => {
      cell.style = estiloEncabezado;
    });

    // Datos
    for (const venta of ventas) {
      const fecha = new Date(venta.fecha);
      const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()} ${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;

      const row = worksheet.addRow([
        venta.codigo,
        fechaFormateada,
        venta.nombreCliente,
        venta.vendedor.fullName,
        venta.subtotal,
        venta.descuento,
        venta.total,
        venta.tipo_pago,
        venta.estado ? '' : 'ANULADO',
        venta.estado ? '' : (venta.fechaAnulada ? new Date(venta.fechaAnulada).toLocaleString() : '—'),
        venta.estado ? '' : venta.usuarioAnulador,
      ]);

      row.eachCell((cell) =>
        aplicarEstilo(cell, venta.estado ? estiloDato : estiloAnulado)
      );

      const hojaVenta = workbook.addWorksheet(`Venta ${venta.codigo}`);
      const fechaAnulado = venta.fechaAnulada ? new Date(venta.fechaAnulada).toLocaleString() : '—';

      // Datos organizados en dos columnas (2 celdas por fila)
      const infoVenta = [
        ['Número de Venta:', venta.codigo, 'Fecha:', fechaFormateada],
        ['Cliente:', venta.nombreCliente, 'Método de Pago:', venta.tipo_pago],
        ['Vendedor:', venta.vendedor.fullName, 'Subtotal:', venta.subtotal],
        ['Descuento:', venta.descuento, 'Total:', venta.total],
      ];

      if (!venta.estado) {
        infoVenta.push(['Estado:', 'ANULADO', 'Fecha de Anulación:', fechaAnulado]);
        infoVenta.push(['Usuario Anulador:', venta.usuarioAnulador, '', '']);
      }

      // Espacio inicial
      hojaVenta.addRow([]);
      hojaVenta.addRow(['DETALLES DE LA VENTA']).getCell(1).font = { bold: true, size: 14 };
      hojaVenta.addRow([]);

      // Añadir datos en dos columnas
      for (const fila of infoVenta) {
        const row = hojaVenta.addRow(fila);
        // Estilo para celdas
        row.eachCell((cell, colNumber) => {
          cell.font = colNumber % 2 !== 0 ? { bold: true } : { bold: false };
          aplicarEstilo(cell, venta.estado ? estiloDato : estiloAnulado);
        });
      }

      // Espacio antes del detalle de productos
      hojaVenta.addRow([]);
      hojaVenta.addRow(['DETALLES DE PRODUCTOS']).getCell(1).font = { bold: true, size: 14 };
      hojaVenta.addRow([]);

      // Encabezado tabla detalles
      const encabezadoDetalles = ['PRODUCTO', 'CANTIDAD', 'CATEGORÍA', 'PRECIO UNITARIO', 'SUBTOTAL'];
      const rowEncabezadoDetalle = hojaVenta.addRow(encabezadoDetalles);
      rowEncabezadoDetalle.eachCell(cell => aplicarEstilo(cell, estiloEncabezado));

      // Agregar productos
      for (const det of venta.detalles) {
        const subtotal = det.precio * det.cantidad;
        const filaDetalle = hojaVenta.addRow([
          det.nombreProducto,
          det.cantidad,
          det.inventario.product.categoria.nombre,
          det.precio,
          subtotal
        ]);
        filaDetalle.eachCell(cell => aplicarEstilo(cell, estiloDato));
      }

      // Ajuste de columnas
      hojaVenta.columns = [
        { width: 30 }, // Producto / label
        { width: 20 }, // Valor
        { width: 25 }, // Segundo label
        { width: 20 }, // Segundo valor
        { width: 20 }, // Subtotal en tabla
      ];

    }

    // Ajuste de columnas
    worksheet.columns = [
      { width: 10 },
      { width: 15 },
      { width: 25 },
      { width: 25 },
      { width: 15 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];

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
      '#', 'PRODUCTO', 'MARCA', 'STOCK', 'MEDIDA', 'CATEGORIA'
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

    ];

    const filePath = `./reporte_ventas_${fechaHoy}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  async generarReporteMovimientosProducto(fechaInicio: string, fechaFn: string, id_inventario: string) {
    const fechaHoy = new Date().toISOString().split('T')[0];

    const inv=await this.inventarioService.obtenerInfoProducto(id_inventario);

    // Obtener movimientos desde el servicio
    const movimientos = await this.movimientosService.obtenerMovimientosPorProducto(id_inventario, fechaInicio, fechaFn);

    // Crear workbook y hoja
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Movimientos Producto');

    // Encabezado principal
    worksheet.mergeCells('A1', 'F1');
    worksheet.getCell('A1').value = `REPORTE DE MOVIMIENTOS DEL PRODUCTO - Fecha: ${fechaHoy}`;
    worksheet.getCell('A1').style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }
    };

    worksheet.mergeCells('A2', 'F2');
    worksheet.getCell('A2').value = `Producto: ${inv.product?.nombre || 'Desconocido'}`;
    worksheet.getCell('A2').style = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'left', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } }
    };

    worksheet.mergeCells('A3', 'F3');
    worksheet.getCell('A3').value = `Periodo: ${fechaInicio} al ${fechaFn}`;
    worksheet.getCell('A3').style = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'left', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } }
    };

    // Fila vacía
    worksheet.addRow([]);

    // Encabezados tabla
    const encabezado = ['#', 'FECHA', 'REFERENCIA', 'ALMACEN', 'CANTIDAD', 'TIPO'];
    const headerRow = worksheet.addRow(encabezado);

    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
    });

    // Datos
    movimientos.forEach((mov, index) => {
      const row = worksheet.addRow([
        index + 1,
        mov.fecha,
        mov.descripcion || '',
        mov.almacen?.nombre || 'Central',
        mov.cantidad,
        mov.tipo,
      ]);

      const isIngreso = mov.tipo.toLowerCase() === 'ingreso';
      const isSalida = mov.tipo.toLowerCase() === 'salida';

      row.eachCell((cell, colNumber) => {
        cell.style = {
          alignment: { vertical: 'middle' },
          border: {
            top: { style: 'thin', color: { argb: 'D9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
            left: { style: 'thin', color: { argb: 'D9D9D9' } },
            right: { style: 'thin', color: { argb: 'D9D9D9' } }
          }
        };

        if (isIngreso) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'C6EFCE' }
          };
          cell.font = { color: { argb: '006100' } };
        } else if (isSalida) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEB9C' }
          };
          cell.font = { color: { argb: '9C6500' } };
        }

        if (colNumber === 1 || colNumber === 5) {
          cell.alignment = { ...cell.alignment, horizontal: 'right' };
        }
      });
    });

    // Ajustar ancho de columnas
    worksheet.columns = [
      { width: 6 },    // #
      { width: 12 },   // Fecha
      { width: 40 },   // Referencia
      { width: 25 },   // Almacén
      { width: 10 },   // Cantidad
      { width: 12 },    // Tipo
      { width: 12 }    // precio compra
    ];

    // Guardar archivo
    const filePath = `./reporte_movimientos_producto_${fechaHoy}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }
}