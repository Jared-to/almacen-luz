import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces';

// Ejemplo de objeto 'Venta'
const ventaEjemplo = {
  codigo: 'V001',
  fecha: '2025-01-10T12:00:00Z',
  tipo_pago: 'Efectivo',
  cliente: {
    nombre: 'Juan Pérez',
    direccion: 'Av. Siempre Viva 123',
  },
  detalles: [
    {
      unidad_medida: 'Caja',
      producto: { sku: 'P001', descripcion: 'Producto 1' },
      precio: 100,
      cantidad: 2,
      subtotal: 200,
      descuento: 20,
    },
    {
      unidad_medida: 'Unidad',
      producto: { sku: 'P002', descripcion: 'Producto 2' },
      precio: 50,
      cantidad: 3,
      subtotal: 150,
      descuento: 15,
    },
  ],
  subtotal: 350,
  descuento: 35,
  total: 315,
};

const formatDate = (value: string | Date): string => {
  const date = new Date(value);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Estilos más sencillos y adecuados para una factura de rollo
const styles: StyleDictionary = {
  header: {
    fontSize: 10,
    bold: true,
    color: '#000000',
    alignment: 'center',
    margin: [0, 5],
  },
  subHeader: {
    fontSize: 10,
    color: '#333333',
    bold: true,
    alignment: 'center',
    margin: [0, 5],
  },
  bodyText: {
    fontSize: 8,
    color: '#333333',
    margin: [0, 3],
  },
  boldText: {
    fontSize: 9,
    bold: true,
  },
  tableHeader: {
    bold: true,
    fontSize: 7,
    color: '#000000',
    alignment: 'center',
  },
  tableRow: {
    fontSize: 7,
    alignment: 'center',
  },
  totalRow: {
    bold: true,
    fontSize: 7,
    color: '#000000',
    alignment: 'right',
  },
  footer: {
    fontSize: 8,
    color: '#7F8C8D',
    alignment: 'center',
    margin: [0, 5],
  },
  pageNumber: {
    fontSize: 8,
    color: '#7F8C8D',
    alignment: 'center',
  }
};

// Generación del reporte en formato rollo (80mm de ancho)
export const billReports = (venta = ventaEjemplo): TDocumentDefinitions => {
  const billProducts = venta.detalles.map((detalle, index) => ({
    No: index + 1,
    Unidad: detalle.unidad_medida || 'No especificada',
    Codigo: detalle.producto?.sku || 'Sin código',
    Producto: detalle.producto?.descripcion || 'Producto desconocido',
    Precio: detalle.precio,
    Cantidad: detalle.cantidad,
    Total: detalle.subtotal,
    Descuento: detalle.descuento || 0,
  }));

  return {
    defaultStyle: {
      fontSize: 8,
      margin: [0, 2], // Espaciado uniforme predeterminado
    },
    pageSize: { height: 550, width: 250 }, // Tamaño de página personalizado (80mm x largo ajustable)
    pageMargins: [10, 10, 10, 10], // Márgenes ajustados
    header: [
      {
        text: 'Factura de Venta',
        style: 'header',
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
        text: 'Empresa',//'Información de la Venta',
        style: 'subHeader',
        margin: [0, 10, 0, 5], // Separación superior e inferior
      },
      {
        columns: [
          {
            width: '70%',
            text: [
              { text: `Cliente: ${venta.cliente?.nombre || 'Cliente desconocido'}\n`, style: 'bodyText' },
              { text: `Dirección: ${venta.cliente?.direccion || 'Dirección desconocida'}\n`, style: 'bodyText' },
              { text: `Código de Venta: ${venta.codigo}\n`, style: 'bodyText' },
              { text: `Fecha de Venta: ${formatDate(venta.fecha)}\n`, style: 'bodyText' },
            ],
          },
          {
            width: '30%',
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
        margin: [0, 10], // Espaciado
      },
      {
        layout: 'lightHorizontalLines',
        table: {
          widths: ['28%', '18%', '18%', '19%', '17%'], // Proporciones ajustadas
          headerRows: 1,
          body: [
            // Encabezado de la tabla
            [
              { text: 'Producto', style: 'tableHeader' },
              { text: 'Precio', style: 'tableHeader' },
              { text: 'Cant', style: 'tableHeader' },
              { text: 'Desc', style: 'tableHeader' },
              { text: 'Total', style: 'tableHeader' },
            ],
            // Filas de los productos
            ...billProducts.map((product) => [
              { text: product.Producto, style: 'tableRow', alignment: 'left' },
              { text: product.Precio.toFixed(2), style: 'tableRow', alignment: 'right' },
              { text: product.Cantidad.toString(), style: 'tableRow', alignment: 'right' },
              { text: product.Descuento.toFixed(2), style: 'tableRow', alignment: 'right' },
              { text: product.Total.toFixed(2), style: 'tableRow', alignment: 'right' },
            ]),
            // Subtotal, descuento y total neto
            [
              { text: 'Subtotal', colSpan: 4, alignment: 'right', style: 'totalRow' },
              {}, {}, {},
              { text: venta.subtotal.toFixed(2), style: 'totalRow' },
            ],
            [
              { text: 'Descuento', colSpan: 4, alignment: 'right', style: 'totalRow' },
              {}, {}, {},
              { text: venta.descuento.toFixed(2), style: 'totalRow' },
            ],
            [
              { text: 'Total Neto', colSpan: 4, alignment: 'right', style: 'totalRow' },
              {}, {}, {},
              { text: venta.total.toFixed(2), style: 'totalRow' },
            ],
          ],
        },
        margin: [0, 10], // Espaciado después de la tabla
      },
      {
        text: 'Gracias por su compra!',
        style: 'footer',
        margin: [0, 10], // Separación final
      },
      { text: 'MicroServicios ITEMS.BO', style: { fontSize: 8, alignment: 'center', bold: true }, margin: [0, 4, 0, 10] },

    ],
    styles: styles,
  };
};

