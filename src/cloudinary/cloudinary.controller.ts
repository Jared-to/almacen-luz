import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpException, HttpStatus } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('images')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) { }
 
  @Post('upload')
  @UseInterceptors(FilesInterceptor('file', 3))
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 4 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' })
        ]
      }),
    ) files: Express.Multer.File[],
  ) {
    // Subir cada archivo a Cloudinary y devolver los resultados
    const uploadPromises = files.map(file => this.cloudinaryService.uploadFile(file));
    return Promise.all(uploadPromises)
      .then(results => ({
        message: 'Images uploaded successfully',
        files: results, // Contendrá los resultados de Cloudinary
      }))
      .catch(error => {
        throw new HttpException(
          'Error uploading files.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });
  }
}
