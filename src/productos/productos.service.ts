import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Categoria } from 'src/categorias/entities/categoria.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { InventarioService } from 'src/inventario/inventario.service';
import { AlmacenesService } from 'src/almacenes/almacenes.service';
import { MovimientosAlmacenService } from 'src/inventario/service/movimientos-almacen.service';
import { HistorialPrecio } from './entities/registros-cambio-precio.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,

    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,

    @InjectRepository(HistorialPrecio)
    private readonly historialRepository: Repository<HistorialPrecio>,

    private readonly cloudinaryService: CloudinaryService,

    private readonly inventarioService: InventarioService,
    private readonly dataSource: DataSource,

    private readonly movimientoInventario: MovimientosAlmacenService,

  ) { }

  // Crear un producto
  async createProducto(createProductoDto: CreateProductoDto, file?: Express.Multer.File): Promise<Producto> {
    const { categoriaId, stock, marca, almacen, sku, fechaExpiracion, precio_compra, precio_min_venta, precio_venta, ...productoData } = createProductoDto;

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Buscar la categoría
      const categoria = await this.categoriaRepository.findOne({
        where: { id: categoriaId },
        transaction: false // No usar transacción aquí si es una consulta simple
      });

      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada`);
      }

      // 2. Manejar la imagen
      let imagesUrl: string;
      if (!file) {
        imagesUrl = 'https://res.cloudinary.com/dsuvpnp9u/image/upload/v1736440720/tli4lpfen5fucruno3l2.jpg';
      } else {
        // Subir imágenes a Cloudinary (fuera de la transacción de BD)
        const uploadResult = await this.cloudinaryService.uploadFile(file);
        imagesUrl = uploadResult.secure_url;
      }

      // 3. Crear y guardar el producto dentro de la transacción
      const producto = this.productoRepository.create({
        ...productoData,
        imagen: imagesUrl || null,
        categoria,
        marca: marca,
        precioVenta: Number(precio_venta),
        precioVentaMin: Number(precio_min_venta),
        precioCompraIn: Number(precio_compra)
      });

      const productoGuardado = await queryRunner.manager.save(Producto, producto);

      // 4. Generar el código basado en el increment
      productoGuardado.codigo = `P${productoGuardado.increment.toString().padStart(4, '0')}`;
      const productoG = await queryRunner.manager.save(Producto, productoGuardado);

      // 5. Realizar ingreso al stock dentro de la transacción
      const inventario = await this.inventarioService.agregarStockTransaccional({
        sku,
        almacenId: almacen,
        cantidad: parseFloat(stock),
        productoId: productoG.id,
        fechaExpiracion,
        costoUnit: Number(precio_compra)
      }, queryRunner);



      // 6. Registrar movimiento de inventario dentro de la transacción
      await this.movimientoInventario.registrarIngresoTransaccional({
        sku: sku,
        almacenId: almacen,
        cantidad: parseFloat(stock),
        productoId: productoG.id,
        descripcion: 'Producto Creado',
        costoUnit: Number(precio_compra),
        inventario
      }, queryRunner);

      // 7. Si todo salió bien, confirmar la transacción
      await queryRunner.commitTransaction();

      return productoG;

    } catch (error) {
      // 8. Si algo falló, hacer rollback
      await queryRunner.rollbackTransaction();

      // 10. Lanzar error apropiado
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error(`Error al crear el producto: ${error.message}`);
    } finally {
      // 11. Liberar el queryRunner siempre
      await queryRunner.release();
    }
  }
  async createProductoExcel(createProductoDto: CreateProductoDto, queryRunner: QueryRunner): Promise<Producto> {
    const { categoriaId, almacen, sku, fechaExpiracion, precio_compra, precio_min_venta, precio_venta, ...productoData } = createProductoDto;

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
          precioVenta: Number(precio_venta),
          precioVentaMin: Number(precio_min_venta),
          precioCompraIn: Number(precio_compra)
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


      const inventario = await this.inventarioService.agregarStockTransaccional({
        almacenId: almacen,//Tomar el unico almacen,
        sku,
        cantidad: parseFloat(createProductoDto.stock),
        productoId: productoG.id,
        fechaExpiracion,
        costoUnit: Number(precio_compra),
      }, queryRunner)
      await this.movimientoInventario.registrarIngresoTransaccional({
        almacenId: almacen,
        sku,
        cantidad: parseFloat(createProductoDto.stock),
        productoId: productoG.id,
        descripcion: 'Producto Creado por Excel Inicial',
        costoUnit: Number(precio_compra),
        inventario
      }, queryRunner)

      return productoG;

    } catch (error) {
      throw new Error(`Error al guardar el producto: ${error.message}`);
    }
  }

  async cambiarPrecioProducto(id_producto: string, precioNuevo: number, precioMinVenta: number,) {


    const producto = await this.productoRepository.findOne({ where: { id: id_producto } });

    if (!producto) {
      throw new NotFoundException('No se encontro el producto');
    }
    const historial = this.historialRepository.create({
      product: { id: id_producto },
      precioVentaAnt: producto.precioVenta ?? 0,
      precioVentaNuevo: precioNuevo,
    });
    await this.historialRepository.save(historial)

    //Cambiar precios del producto 
    producto.precioVenta = precioNuevo;
    producto.precioVentaMin = precioMinVenta;

    await this.productoRepository.save(producto);

  }

  async cambiarPrecioProductoTransaccion(id_producto: string, precioNuevo: number, precioMinVenta: number, queryRunner: QueryRunner) {


    const producto = await queryRunner.manager.findOne(Producto, { where: { id: id_producto } });

    if (!producto) {
      throw new NotFoundException('No se encontro el producto');
    }
    const historial = queryRunner.manager.create(HistorialPrecio, {
      product: { id: id_producto },
      precioVentaAnt: producto.precioVenta ?? 0,
      precioVentaNuevo: precioNuevo,
    });
    await queryRunner.manager.save(historial)

    //Cambiar precios del producto 
    producto.precioVenta = precioNuevo;
    producto.precioVentaMin = precioMinVenta;

    await queryRunner.manager.save(producto);

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
    const { categoriaId, almacen, precio_compra, precio_min_venta, precio_venta, ...productoData } = updateProductoDto;

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
    const productoUpdate = {
      ...producto,
      ...productoData,
      imagen: finalImage || producto.imagen, // Mantener la imagen previa si no se envía una nueva
      categoria,
      precioCompraIn: Number(precio_compra),
      precio_min_venta: Number(precio_min_venta),
      precio_venta: Number(precio_venta)
    };

    if (Number(precio_venta) !== producto.precioVenta) {
      const historial = this.historialRepository.create({
        product: { id: producto.id },
        precioVentaAnt: producto.precioVenta,
        precioVentaNuevo: Number(precio_venta),
      });
      await this.historialRepository.save(historial)
    }


    try {
      return await this.productoRepository.save(productoUpdate);
    } catch (error) {
      throw new Error(`Error al actualizar el producto: ${error.message}`);
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

      // Elimina logico el producto de la base de datos
      producto.is_delete = true;


      await this.productoRepository.save(producto)

      // Devuelve un mensaje de éxito
      return {
        message: "Producto eliminado con éxito.",
      };
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(error);
    }
  }
  // Traer todos los productos
  async findAllProductos(): Promise<any[]> {
    const productos = await this.productoRepository.find({
      where: { is_delete: false },
      relations: ['categoria']
    });

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
