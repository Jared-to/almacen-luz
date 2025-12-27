import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { FileUpload } from './decorators/file-upload.decorator';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interface/valid-roles';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) { }

  // Crear un producto
  @Post()
  @Auth(ValidRoles.admin, ValidRoles.user)
  @UseInterceptors(FileInterceptor('file'))
  async createProducto(
    @Body() createProductoDto: CreateProductoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {

    const producto = await this.productosService.createProducto(createProductoDto, file || null);

    return {
      message: 'Producto creado con éxito',
      producto,
    };
  }

  // Obtener todos los productos
  @Get()
  async findAllProductos() {
    const productos = await this.productosService.findAllProductos();

    return productos;

  }

  // Obtener un producto por ID
  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  async findOneProducto(@Param('id') id: string) {
    const producto = await this.productosService.findOneProducto(id);

    return producto;

  }

  // Editar un producto
  @Patch(':id')
  @Auth(ValidRoles.admin, ValidRoles.user)
  @UseInterceptors(FileInterceptor('file'))
  async updateProducto(
    @Param('id') id: string,  // El ID del producto a actualizar
    @Body() updateProductoDto: UpdateProductoDto,  // Los datos a actualizar
    @UploadedFile() file?: Express.Multer.File,
  ) {

    const productoActualizado = await this.productosService.updateProducto(id, updateProductoDto, file);

    return {
      message: 'Producto actualizado con éxito',
      producto: productoActualizado,
    };
  }

  // Desactiva un producto
  @Patch('estado/:id')
  async desactivarProducto(@Param('id') id: string) {
    await this.productosService.estadoProducto(id);
    return {
      message: 'Producto desactivado con éxito',
    };
  }
  // Eliminar un producto
  @Delete(':id')
  async deleteProducto(@Param('id') id: string) {
    await this.productosService.deleteProducto(id);
    return {
      message: 'Producto eliminado con éxito',
    };
  }


}
