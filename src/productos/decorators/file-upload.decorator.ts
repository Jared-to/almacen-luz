import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export function FileUpload(fieldName: string) {
  return FileInterceptor(fieldName, {
    storage: diskStorage({
      // Define una ruta absoluta fuera de `dist`
      destination: join(process.cwd(), 'uploads'), // Usa `process.cwd()` para apuntar al directorio raíz del proyecto
      filename: (req, file, cb) => {
        const mimeExtensionMap = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
        };
        const extension = mimeExtensionMap[file.mimetype] || extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extension}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('El archivo debe ser una imagen válida (JPEG, PNG o WEBP)'), false);
      }
    },
  });
}
