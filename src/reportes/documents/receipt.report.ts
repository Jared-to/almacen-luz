import type { TDocumentDefinitions, StyleDictionary, Content } from 'pdfmake/interfaces';
import { Venta } from 'src/ventas/entities/venta.entity';
// Función para formatear la fecha
const formatDate = (value: string | Date): string => {
  const date = new Date(value);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
};
// Estilos 
const styles: StyleDictionary = {
  header: { fontSize: 12, bold: true, alignment: 'center', margin: [0, 2] },
  subHeader: { fontSize: 10, bold: true, alignment: 'center', margin: [0, 3] },
  bodyText: { fontSize: 8, margin: [0, 1] },
  boldText: { fontSize: 8, bold: true },
  highlightText: { fontSize: 9, bold: true },
  tableHeader: { bold: true, fontSize: 7, alignment: 'center' },
  tableRow: { fontSize: 7, alignment: 'center' },
  totalRow: { bold: true, fontSize: 7, alignment: 'right' },
  footer: { fontSize: 8, alignment: 'center', margin: [0, 3] },
};
// Función para generar el recibo
export const receiptReport = (venta: Venta): TDocumentDefinitions => {
  const billProducts = venta.detalles.map((detalle, index) => ({
    No: index + 1,
    Unidad: detalle.unidad_medida || 'No especificada',
    Producto: detalle.nombreProducto || 'Producto desconocido',
    Precio: detalle.precio,
    Cantidad: detalle.cantidad,
    Total: detalle.subtotal,
  }));
  // Función para generar contenido del recibo
  const receiptContent = (title: string): Content[] => [
    {
      text: title, // Ejemplo: "Pollos Evans"
      style: 'header',
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        {
          width: '70%',
          stack: [
            { text: `Cliente: ${venta.nombreCliente || 'Cliente desconocido'}`, style: 'bodyText' },
            { text: `Fecha: ${formatDate(venta.fecha)}`, style: 'bodyText' },
          ],
          margin: [0, 0, 0, 2],
        },
        {
          width: '30%',
          stack: [
            { text: `Orden No.: ${venta.codigo}`, style: 'highlightText', alignment: 'left', margin: [-10, 0, 0, 0] },
            { text: `Pago: ${venta.tipo_pago}`, style: 'bodyText', alignment: 'left', margin: [-10, 0, 0, 0] },
            { text: `Celular: 62621393`, style: 'boldText', alignment: 'left', margin: [-10, 0, 0, 0] },
          ],
          margin: [0, 0, 0, 2],
        },
      ],
    },
    { text: 'Detalles de los productos', style: 'subHeader', margin: [0, 3] },
    {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['40%', '20%', '20%', '20%'],
        headerRows: 1,
        body: [
          [
            { text: 'Producto', style: 'tableHeader' },
            { text: 'Precio', style: 'tableHeader' },
            { text: 'Cant', style: 'tableHeader' },
            { text: 'Total', style: 'tableHeader' },
          ],
          ...billProducts.map((product) => [
            { text: product.Producto, style: 'tableRow', alignment: 'left' },
            { text: `${product.Precio.toFixed(2)} Bs.`, style: 'tableRow', alignment: 'center' },
            { text: product.Cantidad.toString(), style: 'tableRow', alignment: 'center' },
            { text: `${product.Total.toFixed(2)} Bs.`, style: 'tableRow', alignment: 'right' },
          ]),
          [
            { text: 'Subtotal', colSpan: 3, alignment: 'right', style: 'totalRow' },
            {}, {},
            { text: `${venta.subtotal.toFixed(2)} Bs.`, style: 'totalRow' },
          ],
          [
            { text: 'Descuento', colSpan: 3, alignment: 'right', style: 'totalRow' },
            {}, {},
            { text: `${venta.descuento.toFixed(2)} Bs.`, style: 'totalRow' },
          ],
          [
            { text: 'Total Neto', colSpan: 3, alignment: 'right', style: 'totalRow' },
            {}, {},
            { text: `${venta.total.toFixed(2)} Bs.`, style: 'totalRow' },
          ],
        ],
      },
      margin: [0, 5],
    },
    { text: 'Gracias por su compra!', style: 'footer', margin: [0, 3] },
    { text: 'COMERCIO.BO', style: { fontSize: 8, alignment: 'center', bold: true }, margin: [0, 4, 0, 10] },
  ];

  return {
    defaultStyle: { fontSize: 8, margin: [0, 2] },
    pageSize: { width: 250, height: 'auto' },
    pageMargins: [10, 10, 10, 10],
    content: [
      ...receiptContent('ALMACEN LUZ'),
    ] as Content[],
    styles: styles,
  };
};