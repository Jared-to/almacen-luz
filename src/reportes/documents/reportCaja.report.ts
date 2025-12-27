import type { Content, StyleDictionary, TDocumentDefinitions } from 'pdfmake/interfaces';
import { Caja } from 'src/cajas/entities/caja.entity';
import { Gasto } from 'src/gastos/entities/gasto.entity';
import { Venta } from 'src/ventas/entities/venta.entity';

const formatDate = (value: string | Date): string => {
  const date = new Date(value);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const styles: StyleDictionary = {
  header: {
    fontSize: 24,
    bold: true,
    color: '#2C3E50',
    margin: [0, 10, 0, 10],
    alignment: 'center',
  },
  subHeader: {
    fontSize: 16,
    color: '#2980B9',
    bold: true,
    margin: [0, 5],
    alignment: 'left',
  },
  tableHeader: {
    bold: true,
    fontSize: 10,
    fillColor: '#ECF0F1',
    color: '#2C3E50',
    alignment: 'center',
  },
  tableRow: {
    fontSize: 10,
    alignment: 'center',
  },
  totalRow: { 
    bold: true, 
    fontSize: 10, 
    fillColor: '#568cc1', 
    color: 'white', 
    alignment: 'right' 
  },
  footer: { 
    fontSize: 8, 
    color: '#7F8C8D', 
    alignment: 'center', 
    margin: [0, 10] 
  },
  pageNumber: { 
    fontSize: 8, 
    color: '#7F8C8D', 
    alignment: 'center' 
  },
};

export const cajaReport = (caja: Caja, ventas: Venta[], gastos: Gasto[]): TDocumentDefinitions => {
  const totalEfectivo = caja.ventas_Efectivo + caja.gastos_efectivo;
  const totalQR = caja.ventas_QR + caja.gastos_QR;
  
  return {
    pageSize: 'A4',
    header: [
      { columns: [{ text: 'Reporte de Caja', style: 'header', alignment: 'center' }] },
    ],
    footer: (currentPage, pageCount) => ({
      text: `Página ${currentPage} de ${pageCount}`,
      style: 'pageNumber',
    }),
    content: [
      { text: 'Información de la Caja', style: 'subHeader' },
      {
        columns: [
          {
            text: [
              { text: `Código de Caja: ${caja.codigo}\n`, style: 'bodyText' },
              { text: `Usuario: ${caja.usuario?.fullName || 'No disponible'}\n`, style: 'bodyText' },
              { text: `Fecha de Apertura: ${formatDate(caja.fecha_apertura)}\n`, style: 'bodyText' },
            ],
          },
          {
            text: [
              { text: `Fecha de Cierre: ${formatDate(caja.fecha_cierre)}\n`, style: 'bodyText' },
              { text: `Saldo de Apertura: ${caja.saldo_apertura.toFixed(2)} Bs.\n`, style: 'bodyText' },
            ],
            alignment: 'right',
          },
        ],
      },
      
      { text: 'Ventas y Gastos en Efectivo', style: 'subHeader' },
      {
        layout: 'lightHorizontalLines',
        table: {
          // widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
          widths: ['20%', '20%', '20%', '20%', '20%'],
          headerRows: 1,
          body: [
            [
              { text: 'Ventas Efectivo', style: 'tableHeader' },
              { text: 'Gastos Efectivo', style: 'tableHeader' },
              { text: 'Total Ingresos Efectivo', style: 'tableHeader' },
              { text: 'Total Salidas Efectivo', style: 'tableHeader' },
              { text: 'Saldo Cierre Efectivo', style: 'tableHeader' },
            ],
            [
              { text: `${caja.ventas_Efectivo.toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${caja.gastos_efectivo.toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${(caja.ventas_Efectivo).toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${(caja.gastos_efectivo).toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${caja.saldo_cierre_efectivo.toFixed(2)} Bs.`, style: 'tableRow' },
            ],
            [
              { text: 'Total en Efectivo:', colSpan: 4, alignment: 'right', style: 'totalRow' },
              {}, {}, {},
              { text: `${totalEfectivo.toFixed(2)} Bs.`, style: 'totalRow' },
            ],
          ],
        },
      },

      { text: 'Ventas y Gastos en QR', style: 'subHeader' },
      {
        layout: 'lightHorizontalLines',
        table: {
          //widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
          widths: ['20%', '20%', '20%', '20%', '20%'],
          headerRows: 1,
          body: [
            [
              { text: 'Ventas QR', style: 'tableHeader' },
              { text: 'Gastos QR', style: 'tableHeader' },
              { text: 'Total Ingresos QR', style: 'tableHeader' },
              { text: 'Total Salidas QR', style: 'tableHeader' },
              { text: 'Saldo Cierre QR', style: 'tableHeader' },
            ],
            [
              { text: `${caja.ventas_QR.toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${caja.gastos_QR.toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${(caja.ventas_QR).toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${(caja.gastos_QR).toFixed(2)} Bs.`, style: 'tableRow' },
              { text: `${caja.saldo_cierre_QR.toFixed(2)} Bs.`, style: 'tableRow' },
            ],
            [
              { text: 'Total en QR:', colSpan: 4, alignment: 'right', style: 'totalRow' },
              {}, {}, {},
              { text: `${totalQR.toFixed(2)} Bs.`, style: 'totalRow' },
            ],
          ],
        },
      },

      { text: 'Ventas Registradas', style: 'subHeader' },
      {
        layout: 'lightHorizontalLines',
        table: {
          //widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          widths: ['16%', '16%', '16%', '16%', '16%', '16%'],
          headerRows: 1,
          body: [
            [
              { text: 'Código', style: 'tableHeader' },
              { text: 'Fecha', style: 'tableHeader' },
              { text: 'Vendedor', style: 'tableHeader' },
              { text: 'Tipo de Pago', style: 'tableHeader' },
              { text: 'Descuento', style: 'tableHeader' },
              { text: 'Total', style: 'tableHeader' },
            ],
            ...ventas.map(venta => [
              { text: venta.codigo, style: 'tableRow' },
              { text: formatDate(venta.fecha), style: 'tableRow' },
              { text: venta.vendedor?.fullName || 'No disponible', style: 'tableRow' },
              { text: venta.tipo_pago, style: 'tableRow' },
              { text: `${(venta.subtotal - venta.total).toFixed(2)}`, style: 'tableRow' },
              { text: `${venta.total.toFixed(2)} Bs.`, style: 'tableRow' },
            ]),
          ],
        },
      },

      { text: 'Resumen de Gastos', style: 'subHeader' },
      {
        layout: 'lightHorizontalLines',
        table: {
          //widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          widths: ['14%', '14%', '14%', '14%', '14%', '14%', '16%'],
          headerRows: 1,
          body: [
            [
              { text: 'Código', style: 'tableHeader' },
              { text: 'Fecha', style: 'tableHeader' },
              { text: 'Usuario', style: 'tableHeader' },
              { text: 'Tipo', style: 'tableHeader' },
              { text: 'Categoría', style: 'tableHeader' },
              { text: 'Tipo Pago', style: 'tableHeader' },
              { text: 'Monto', style: 'tableHeader', alignment: 'right' },
            ],
            ...gastos.map(gasto => [
              { text: gasto.codigo || 'N/A', style: 'tableRow' },
              { text: formatDate(gasto.fecha), style: 'tableRow' },
              { text: gasto.usuario?.fullName || 'N/A', style: 'tableRow' },
              { text: gasto.tipo, style: 'tableRow' },
              { text: gasto.categoria?.nombre || 'N/A', style: 'tableRow' },
              { text: gasto.tipo_pago, style: 'tableRow' },
              { text: `${gasto.monto.toFixed(2)} Bs.`, style: 'tableRow', alignment: 'right' },
            ]),
          ],
        },
      },
    ],
    styles: styles,
  };
};
