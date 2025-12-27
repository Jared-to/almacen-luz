import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Categoria } from 'src/categorias/entities/categoria.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { InventarioService } from 'src/inventario/inventario.service';
import { AlmacenesService } from 'src/almacenes/almacenes.service';
import { MovimientosAlmacenService } from 'src/inventario/service/movimientos-almacen.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,

    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,

    private readonly cloudinaryService: CloudinaryService,

    private readonly inventarioService: InventarioService,
    private readonly almacenService: AlmacenesService,
    private readonly movimientoInventario: MovimientosAlmacenService,

  ) { }

  // Crear un producto
  async createProducto(createProductoDto: CreateProductoDto, file?: Express.Multer.File): Promise<Producto> {
    const { categoriaId, stock, marca, almacen, sku, fechaExpiracion, ...productoData } = createProductoDto;

    let imagesUrl
    try {
      const categoria = await this.categoriaRepository.findOne({ where: { id: categoriaId } });
      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada`);
      }
      if (!file) {
        imagesUrl = 'https://res.cloudinary.com/dsuvpnp9u/image/upload/v1736440720/tli4lpfen5fucruno3l2.jpg';
      } else {
        // Subir imágenes a Cloudinary
        const uploadPromises = await this.cloudinaryService.uploadFile(file);
        imagesUrl = uploadPromises.secure_url;
      }

      const producto = this.productoRepository.create({
        ...productoData,
        imagen: imagesUrl || null,
        categoria,
        marca: marca,
        precio_venta: parseFloat(productoData.precio_venta),
      });
      const productoGuardado = await this.productoRepository.save(producto);

      // Generar el código basado en el increment
      productoGuardado.codigo = `P${productoGuardado.increment.toString().padStart(4, '0')}`;

      // Guardar nuevamente el producto con el código generado
      const productoG = await this.productoRepository.save(productoGuardado);

      //!almacen
      await this.inventarioService.agregarStock({
        sku,
        almacenId: almacen,//Tomar el unico almacen,
        cantidad: parseFloat(stock),
        productoId: productoG.id,
        fechaExpiracion
      })
      await this.movimientoInventario.registrarIngreso({
        sku: sku,
        almacenId: almacen,
        cantidad: parseFloat(stock),
        productoId: productoG.id,
        descripcion: 'Producto Creado',
      })

      return productoG;

    } catch (error) {
      throw new Error(`Error al guardar el producto: ${error.message}`);
    }
  }

  async createProductoExcel(createProductoDto: CreateProductoDto, queryRunner: QueryRunner): Promise<Producto> {
    const { categoriaId, almacen, sku, fechaExpiracion, ...productoData } = createProductoDto;

    let imagesUrl;
    try {
      // Buscar la categoría usando el QueryRunner si está presente
      const categoria = queryRunner
        ? await queryRunner.manager.findOne(Categoria, { where: { id: categoriaId } })
        : await this.categoriaRepository.findOne({ where: { id: categoriaId } });

      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada`);
      }

      // Asignar imagen predeterminada si no se proporciona una
      if (!productoData.imagen) {
        imagesUrl =
          'https://res.cloudinary.com/dsuvpnp9u/image/upload/v1736440720/tli4lpfen5fucruno3l2.jpg';
      }

      // Crear el producto usando el QueryRunner si está presente
      const producto =
        queryRunner.manager.create(Producto, {
          ...productoData,
          imagen: imagesUrl || null,
          categoria,
          precio_venta: parseFloat(productoData.precio_venta),
        });

      // Guardar el producto usando el QueryRunner si está presente
      const productoGuardado = await queryRunner.manager.save(Producto, producto)


      // Validar si 'increment' existe
      if (!productoGuardado.increment) {
        productoGuardado.increment = 1; // En caso de que sea nulo
      }

      // Generar el código basado en el increment
      productoGuardado.codigo = `P${productoGuardado.increment.toString().padStart(4, '0')}`;

      // Guardar nuevamente el producto con el código generado usando el QueryRunner
      const productoG = await queryRunner.manager.save(Producto, productoGuardado);


      await this.inventarioService.agregarStockTransaccional({
        almacenId: almacen,//Tomar el unico almacen,
        sku,
        cantidad: parseFloat(createProductoDto.stock),
        productoId: productoG.id,
        fechaExpiracion
      }, queryRunner)
      await this.movimientoInventario.registrarIngresoTransaccional({
        almacenId: almacen,
        sku,
        cantidad: parseFloat(createProductoDto.stock),
        productoId: productoG.id,
        descripcion: 'Producto Creado',
      }, queryRunner)

      return productoG;

    } catch (error) {
      throw new Error(`Error al guardar el producto: ${error.message}`);
    }
  }


  // Traer un producto por su ID
  async findOneProducto(id: string): Promise<Producto> {
    const producto = await this.productoRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .select([
        'producto.id',
        'producto.codigo',
        'producto.nombre',
        'producto.precio_venta',
        'producto.imagen',
        'producto.marca',
        'producto.unidad_medida',
        'categoria',
      ])
      .where('producto.id = :id', { id })
      .getOne();

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  // Editar un producto
  async updateProducto(
    id: string,
    updateProductoDto: UpdateProductoDto,
    file?: Express.Multer.File
  ): Promise<Producto> {
    const { categoriaId, ...productoData } = updateProductoDto;

    // Verificar si el producto existe
    let producto = await this.productoRepository.findOne({ where: { id } });
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    // Verificar si la categoría debe ser actualizada
    let categoria = producto.categoria;
    if (categoriaId) {
      categoria = await this.categoriaRepository.findOne({ where: { id: categoriaId } });
      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada`);
      }
    }
    let finalImage = null;
    // 1. Eliminar las imágenes antiguas de Cloudinary y BD si es necesario
    if (file) {
      // Eliminar imágenes anteriores de Cloudinary

      if (producto.imagen !== 'https://res.cloudinary.com/dsuvpnp9u/image/upload/v1736440720/tli4lpfen5fucruno3l2.jpg') {
        const publicId = this.extractPublicId(producto.imagen);
        await this.cloudinaryService.deleteFile(publicId); // Eliminar de Cloudinary
      }
      // cargar nuevas imagenes
      const uploadPromises = await this.cloudinaryService.uploadFile(file);
      finalImage = uploadPromises.secure_url;
    }

    // Actualizar los datos del producto
    producto = {
      ...producto,
      ...productoData,
      imagen: finalImage || producto.imagen, // Mantener la imagen previa si no se envía una nueva
      categoria,
      precio_venta: parseFloat(productoData.precio_venta),
    };

    try {
      return await this.productoRepository.save(producto);
    } catch (error) {
      throw new Error(`Error al actualizar el producto: ${error.message}`);
    }
  }

  // Eliminar un producto
  async deleteProducto(id: string): Promise<Object> {
    try {

      // Busca el producto por ID
      const producto = await this.productoRepository.findOne({ where: { id: id } });

      // Si no se encuentra el producto, lanza un error
      if (!producto) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }

      // Eliminar imagen relacionada si no es la imagen predeterminada
      if (producto.imagen !== 'https://res.cloudinary.com/dsuvpnp9u/image/upload/v1736440720/tli4lpfen5fucruno3l2.jpg') {
        const publicId = this.extractPublicId(producto.imagen);
        await this.cloudinaryService.deleteFile(publicId); // Eliminar de Cloudinary
      }

      // Elimina el producto de la base de datos
      await this.productoRepository.remove(producto);

      // Devuelve un mensaje de éxito
      return {
        message: "Producto eliminado con éxito.",
      };
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(error);
    }
  }

  // Desactivar o activar producto
  async estadoProducto(id: string) {
    // Busca el producto por ID
    const producto = await this.productoRepository.findOne({ where: { id: id } });

    // Si no se encuentra el producto, lanza un error
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    // Cambia el estado a 'Inactivo o Activo'
    if (producto.estado) {
      producto.estado = false;
    } else {
      producto.estado = true;
    }

    // Guarda los cambios en la base de datos
    await this.productoRepository.save(producto);

    // Devuelve un mensaje de éxito
    return {
      message: 'Producto desactivado con éxito.',
    };
  }

  // Traer todos los productos
  async findAllProductos(): Promise<any[]> {
    const productos = await this.productoRepository.find({ relations: ['categoria'] });

    return productos;
  }
  async getProductosCount(): Promise<number> {
    return this.productoRepository.count();
  }
  private extractPublicId(url: string): string {
    const parts = url.split('/');
    const fileWithExtension = parts[parts.length - 1];
    return fileWithExtension.split('.')[0]; // Elimina la extensión para obtener el public_id
  }
}
