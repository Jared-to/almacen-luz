import { v2 as cloudinary } from 'cloudinary'

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    return cloudinary.config({
      cloud_name: process.env.CLOD_NAME,
      api_key: process.env.CLOD_API_KEY,
      api_secret: process.env.CLOD_API_SECRET
    });
  }
}