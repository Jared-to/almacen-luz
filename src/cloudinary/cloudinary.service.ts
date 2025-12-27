import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryResponse } from './cloudinary-response';
import { v2 as cloudinary } from 'cloudinary'

const streamifier = require('streamifier');

@Injectable()
export class CloudinaryService {

  uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {


    return new Promise<CloudinaryResponse>((resolve, reject) => {


      const uploadStream = cloudinary.uploader.upload_stream(
        (error, result) => {

          if (error) return reject(error);
          resolve(result);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    })

  }
  // Eliminar un archivo de Cloudinary
  async deleteFile(publicId: string): Promise<{ result: string }> {
    try {
      const response = await cloudinary.uploader.destroy(publicId);
      return response; // Retorna el resultado (p. ej., { result: "ok" })
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw new InternalServerErrorException('Failed to delete file from Cloudinary');
    }
  }

}
