import { Injectable } from '@nestjs/common';
//import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces'

const PdfPrinter = require('pdfmake');

// Define font files
const fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Medium.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-MediumItalic.ttf'
  }
};

@Injectable()
export class PrinterService {
  private printer = new PdfPrinter(fonts);

  createPdf(docDefinition: TDocumentDefinitions) {
    try {
      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
      return pdfDoc;
    } catch (error) {
      throw new Error(`Error al crear el documento PDF: ${error}`);
    }
  }

}
