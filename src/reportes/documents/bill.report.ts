import type { Content, StyleDictionary, TDocumentDefinitions } from 'pdfmake/interfaces';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Formatter } from '../helpers/formatter';

const formatDate = (value: string | Date): string => {
  const date = new Date(value);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Estilos mejorados
const styles: StyleDictionary = {
  header: {
    fontSize: 24,
    bold: true,
    color: '#2C3E50',
    margin: [0, 10, 0, 10],
  },
  subHeader: {
    fontSize: 16,
    color: '#2980B9',
    bold: true,
    margin: [0, 5, 0, 5],
  },
  bodyText: {
    fontSize: 10,
    margin: [0, 5, 0, 5],
  },
  boldText: {
    fontSize: 10,
    bold: true,
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
    fillColor: '#34495E',
    color: 'white',
    alignment: 'right',
  },
  footer: {
    fontSize: 8,
    color: '#7F8C8D',
    alignment: 'center',
    margin: [0, 10, 0, 10],
  },
  pageNumber: {
    fontSize: 8,
    color: '#7F8C8D',
    alignment: 'center',
  }
};

// Generación del reporte
export const billReport = (venta: Venta): TDocumentDefinitions => {
  const billProducts = venta.detalles.map((detalle, index) => ({
    No: index + 1,
    Unidad: detalle.unidad_medida || 'No especificada',
    Producto: detalle.nombreProducto || 'Producto desconocido',
    Precio: detalle.precio,
    Cantidad: detalle.cantidad,
    Total: detalle.subtotal,
    Marca: detalle.marca || detalle?.inventario?.product?.marca,
  }));

  return {
    defaultStyle: {},
    pageSize: 'A4',
    header: [
      {
        columns: [
          {
            text: 'Reporte de Venta',
            style: 'header',
            alignment: 'center',
          },
        ],
      },
    ],
    footer: function (currentPage, pageCount) {
      return {
        text: `Página ${currentPage} de ${pageCount}`,
        style: 'pageNumber',
      };
    },
    content: [
      {
        text: 'Nombre Empresa',//'Información de la Venta',
        style: 'subHeader',
        margin: [0, 10, 0, 5], // Separación superior e inferior
      },
      {
        columns: [
          {
            text: [
              { text: `Cliente: ${venta.nombreCliente || 'Cliente desconocido'}\n`, style: 'bodyText' },
              { text: `Código de Venta: ${venta.codigo}\n`, style: 'bodyText' },
              { text: `Fecha de Venta: ${formatDate(venta.fecha)}\n`, style: 'bodyText' },
            ],
          },
          {
            text: [
              { text: `Factura No.: ${venta.codigo}\n`, style: 'bodyText' },
              { text: `Modalidad: ${venta.tipo_pago}\n`, style: 'bodyText' },
            ],
            alignment: 'right',
          },
        ],
      },
      {
        text: 'Detalles de los productos',
        style: 'subHeader',
      },
      {
        layout: 'lightHorizontalLines',
        table: {
          widths: [ '*', 'auto', 'auto', 'auto'],
          headerRows: 1,
          body: [
            // Encabezado de la tabla
            [
              { text: 'Producto', style: 'tableHeader' },
              { text: 'Precio', style: 'tableHeader' },
              { text: 'Cantidad', style: 'tableHeader' },
              { text: 'Subtotal', style: 'tableHeader' },
            ],
            // Filas de los productos
            ...billProducts.map((product) => [
              { text: product.Producto, style: 'tableRow' },
              { text: product.Precio.toFixed(2) + ' Bs.', style: 'tableRow' },
              { text: product.Cantidad, style: 'tableRow' },
              { text: (product.Total).toFixed(2) + ' Bs.', style: 'tableRow' },
            ]),
            // Subtotal, descuento y total neto
            [
              { text: 'Subtotal', colSpan: 3, alignment: 'right', style: 'tableRow' },
              {}, {}, 
              { text: venta.subtotal.toFixed(2) + ' Bs.', style: 'totalRow' },
            ],
            [
              { text: 'Descuento', colSpan: 3, alignment: 'right', style: 'tableRow' },
              {}, {}, 
              { text: venta.descuento.toFixed(2) + ' Bs.', style: 'totalRow' },
            ],
            [
              { text: 'Total Neto', colSpan: 3, alignment: 'right', style: 'totalRow' },
              {}, {}, 
              { text: venta.total.toFixed(2) + ' Bs.', style: 'totalRow' },
            ],
          ],
        },
      },
    ],
    styles: styles,
  };
};
