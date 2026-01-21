import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, MoreThan, QueryRunner, Repository } from 'typeorm';

import { CreateInventarioDto } from './dto/create-inventario.dto';
import { Inventario } from './entities/inventario.entity';
import { InventarioInicialDto } from './dto/inventario-inicial.dto';
import { inventarioInicial } from './entities/inventario-inicial.entity';
import { MovimientosAlmacenService } from './service/movimientos-almacen.service';
import { ProductosService } from 'src/productos/productos.service';
import { AlmacenesService } from 'src/almacenes/almacenes.service';
import { TraspasoProductoDto } from './dto/traspaso-producto.dto';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    @Inject(forwardRef(() => ProductosService))
    private readonly productosService: ProductosService,
    private readonly AlmacenService: AlmacenesService
  ) { }

  // Traer productos de un almacén específico
  async find(): Promise<Inventario[]> {
    // Obtener productos relacionados al almacén
    return await this.inventarioRepository.find({
      relations: ['product', 'product.categoria', 'almacen'],
      order: { createDate: 'ASC' }
    })
  }


  async agregarStock(createInventarioDto: CreateInventarioDto): Promise<Inventario> {
    const { almacenId, cantidad, productoId, sku, fechaExpiracion, costoUnit } = createInventarioDto;

    let inventario = await this.inventarioRepository.findOne({
      where: { almacen: { id: almacenId }, product: { id: productoId } },
    });

    if (!inventario) {
      let product = await this.productosService.findOneProducto(productoId);
      let almacen = await this.AlmacenService.findOne(almacenId);
      inventario = this.inventarioRepository.create({
        almacen: almacen,
        product: product,
        stock: cantidad,
        sku,
        fechaExpiracion,
        costoUnit
      });
    } else {
      inventario.stock = inventario.stock + Number(cantidad);
      inventario.costoUnit = costoUnit;
    }

    // Guardar en la base de datos
    await this.inventarioRepository.save(inventario);

    return inventario; // Retornar el inventario actualizado
  }

  async cambiarFechaExpiracion(id_inventario: string, fechaExpiracion: Date): Promise<Inventario> {

    let inventario = await this.inventarioRepository.findOne({
      where: { id: id_inventario },
    });

    if (!inventario) {
      throw new NotFoundException('No se encontro el inventario.');
    } else {
      inventario.fechaExpiracion = fechaExpiracion;
    }

    // Guardar en la base de datos
    await this.inventarioRepository.save(inventario);

    return inventario; // Retornar el inventario actualizado
  }

  async traspasoProducto(traspasoProducto: TraspasoProductoDto): Promise<Inventario> {
    const { almacenId, cantidad, productoId, sku, inventario_id } = traspasoProducto;

    let inventarioOrigin = await this.inventarioRepository.findOne({
      where: { id: inventario_id },
    });

    let inventario = await this.inventarioRepository.findOne({
      where: { almacen: { id: almacenId }, product: { id: productoId } },
    });

    if (!inventarioOrigin) {
      throw new NotFoundException(`No se encontro el producto`);
    } else {
      inventarioOrigin.stock -= cantidad;
    }


    if (!inventario) {
      let product = await this.productosService.findOneProducto(productoId);
      let almacen = await this.AlmacenService.findOne(almacenId);
      inventario = this.inventarioRepository.create({
        almacen: almacen,
        product: product,
        stock: cantidad,
        sku
      });
    } else {
      inventario.stock += cantidad;
    }

    // Guardar en la base de datos
    await this.inventarioRepository.save(inventarioOrigin);
    await this.inventarioRepository.save(inventario);

    return inventario; // Retornar el inventario actualizado
  }

  // Descontar stock de un producto en un almacén
  async descontarStock(createInventarioDto: CreateInventarioDto): Promise<Inventario> {
    const { almacenId, cantidad, productoId } = createInventarioDto;

    const inventario = await this.inventarioRepository.findOne({
      where: { almacen: { id: almacenId }, product: { id: productoId }, },
    });

    if (!inventario) {
      throw new NotFoundException(`El producto no está registrado en el inventario para este almacén.`);
    }

    if (inventario.stock < cantidad) {
      throw new Error('No hay suficiente stock disponible para descontar esta cantidad.');
    }

    inventario.stock = inventario.stock - Number(cantidad);

    // Guardar en la base de datos
    await this.inventarioRepository.save(inventario);

    return inventario; // Retornar el inventario actualizado
  }
  async agregarStockTransaccional(
    createInventarioDto: CreateInventarioDto,
    queryRunner: QueryRunner
  ): Promise<Inventario> {

    const {
      almacenId,
      cantidad,
      productoId,
      sku,
      fechaExpiracion,
      costoUnit
    } = createInventarioDto;

    let inventario = await queryRunner.manager.findOne(Inventario, {
      where: {
        almacen: { id: almacenId },
        product: { id: productoId },
      },
      relations: ['almacen']
    });

    if (!inventario) {

      inventario = queryRunner.manager.create(Inventario, {
        almacen: { id: almacenId },
        product: { id: productoId },
        stock: Number(cantidad),
        sku,
        fechaExpiracion,
        costoUnit
      });

    } else {
      inventario.stock += Number(cantidad);
      inventario.costoUnit = costoUnit;
    }


    return await queryRunner.manager.save(inventario);
  }


  // Descontar stock de un producto en un almacén
  async descontarStockTransaccional(createInventarioDto: CreateInventarioDto, queryRunner: QueryRunner): Promise<Inventario> {
    const { almacenId, cantidad, productoId } = createInventarioDto;

    const inventario = await queryRunner.manager.findOne(Inventario, {
      where: { almacen: { id: almacenId }, product: { id: productoId } },
    });

    if (!inventario) {
      throw new NotFoundException(`El producto no está registrado en el inventario para este almacén.`);
    }

    if (inventario.stock < cantidad) {
      throw new Error('No hay suficiente stock disponible para descontar esta cantidad.');
    }

    inventario.stock = parseFloat(inventario.stock.toFixed(2)) - parseFloat(cantidad.toFixed(2));

    // Guardar en la base de datos
    await queryRunner.manager.save(Inventario, inventario);

    return inventario; // Retornar el inventario actualizado
  }

  // Traer todo el inventario
  async obtenerInventarioCompleto(): Promise<any[]> {
    const inventario = await this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoin('inventario.product', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .leftJoin('inventario.almacen', 'almacen')
      .select([
        'inventario.id AS inventario_id',
        'inventario.stock AS stock',
        'inventario.sku AS sku',
        'producto.id AS producto_id',
        'producto.nombre AS producto_nombre',
        'producto.unidad_medida AS unidad_medida',
        'producto.marca AS marca',
        'producto.precioVenta AS precio_venta',
        'producto.precioVentaMin AS precio_min_venta',
        'producto.imagen AS imagen',
        'producto.codigo AS codigo',
        'producto.estado AS estado',
        'inventario.fechaExpiracion AS fecha_expiracion',
        'categoria.nombre AS categoria_nombre',
        'almacen.id AS almacen_id',
        'almacen.nombre AS almacen_nombre',
        'almacen.ubicacion AS almacen_ubicacion'
      ])
      .where('producto.is_delete = :is_delete', { is_delete: false })
      .orderBy('inventario.createDate', 'ASC')
      .getRawMany();

    return inventario;
  }

  async obtenerInventarioPorProducto(inventarioID: string): Promise<any> {
    const inventario = await this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoin('inventario.product', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .leftJoin('inventario.almacen', 'almacen')
      .select([
        'inventario.id AS inventario_id',
        'inventario.stock AS stock',
        'inventario.sku AS sku',
        'producto.id AS producto_id',
        'producto.nombre AS producto_nombre',
        'producto.unidad_medida AS unidad_medida',
        'producto.marca AS marca',
        'producto.precioVenta AS precio_venta',
        'producto.precioVentaMin AS precio_min_venta',
        'producto.imagen AS imagen',
        'producto.codigo AS codigo',
        'producto.estado AS estado',
        'categoria.nombre AS categoria_nombre',
        'almacen.id AS almacen_id',
        'almacen.nombre AS almacen_nombre',
        'almacen.ubicacion AS almacen_ubicacion'
      ])
      .where('inventario.id = :inventarioID', { inventarioID }).getRawOne();

    return inventario;
  }


  async obtenerInventarioVenta(id_almacen: string): Promise<any[]> {
    const inventario = await this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoin('inventario.product', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .leftJoin('inventario.almacen', 'almacen')
      .select([
        'inventario.id AS inventario_id',
        'inventario.stock AS stock',
        'inventario.sku AS sku',
        'producto.id AS producto_id',
        'producto.nombre AS producto_nombre',
        'producto.unidad_medida AS unidad_medida',
        'producto.marca AS marca',
        'producto.precioVenta AS precio_venta',
        'producto.precioVentaMin AS precio_venta_min',
        'producto.imagen AS imagen',
        'producto.codigo AS codigo',
        'producto.estado AS estado',
        'categoria.nombre AS categoria_nombre',
        'categoria.id AS categoriaID',
        'almacen.id AS almacen_id',
        'almacen.nombre AS almacen_nombre',
        'inventario.costoUnit AS costoUnit',
      ])
      .where('producto.estado = true')
      .andWhere('inventario.stock > 0')
      .andWhere('producto.is_delete = :is_delete', { is_delete: false })
      .andWhere('almacen.id = :id_almacen', { id_almacen }) // 👈 filtro por almacén
      .getRawMany();

    return inventario;
  }

  // Traer productos de un almacén específico
  async obtenerProductosPorAlmacen(almacenId: string): Promise<any> {
    // Validar si el almacén existe
    const almacen = await this.AlmacenService.findOne(almacenId);

    if (!almacen) {
      throw new NotFoundException(`Almacén con ID ${almacenId} no encontrado`);
    }

    // Obtener productos relacionados al almacén
    const inventario = await this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.product', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('inventario.almacen', 'almacen')
      .select([
        'producto.id AS id_producto',
        'producto.codigo AS codigo',
        'producto.nombre AS alias',
        'producto.imagen AS imagen',
        'producto.marca AS marca',
        'producto.precioVenta AS precio_venta',
        'inventario.sku AS sku',
        'producto.unidad_medida AS unidad_medida',
        'categoria.nombre AS categoria',
        'almacen.nombre AS almacen',
        'almacen.id AS almacen_id',
        'inventario.stock AS stock',
        'inventario.id AS id_inventario',
        'inventario.costoUnit AS costoUnit',
      ])
      .where('producto.estado = true')
      .andWhere('producto.is_delete = :is_delete', { is_delete: false })
      .andWhere('almacen.id = :almacenId', { almacenId })
      .getRawMany();

    // Construir la respuesta con detalles del almacén y productos
    return {
      nombre: almacen.nombre,
      ubicacion: almacen.ubicacion,
      inventario, // Lista de productos con detalles
    };
  }

  async obtenerAlmacenesPorProducto(productoId: string): Promise<any[]> {
    // Validar si el producto existe
    const producto = await this.productosService.findOneProducto(productoId);

    if (!producto) {
      throw new NotFoundException(`Producto con ID "${productoId}" no encontrado.`);
    }

    // Obtener almacenes relacionados al producto desde el inventario
    const inventario = await this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.product', 'producto')
      .leftJoinAndSelect('inventario.almacen', 'almacen')
      .where('inventario.product = :productoId', { productoId })
      .select([
        'inventario.almacen AS almacen_nombre',
        'almacen.nombre AS almacen_nombre',
        'inventario.stock AS stock',
        'inventario.codigo_barras AS codigo_barras',
        'producto.alias AS producto_nombre',
        'producto.descripcion AS producto_descripcion',
        'producto.unidad_medida AS unidad_medida',
        'inventario.sku AS sku',
        'inventario.producto AS precio_venta',
        'producto.imagen AS imagen',
        'producto.codigo AS codigo',
      ])
      .orderBy('inventario.almacen', 'ASC')
      .getRawMany();

    if (!inventario || inventario.length === 0) {
      throw new NotFoundException(`No se encontraron registros del producto con ID "${productoId}" en ningún almacén.`);
    }

    // Formatear la respuesta
    return inventario
  }


  async obtenerInfoProducto(id_inventario: string): Promise<Inventario> {

    const productoInfo = await this.inventarioRepository.findOne({ where: { id: id_inventario }, relations: ['product', 'almacen', 'product.categoria'] })

    if (!productoInfo) {
      throw new NotFoundException(`No se encontró información para el producto con ID "${id_inventario}".`);
    }

    return productoInfo
  }

  async obtenerProductoPorAlmacenYProducto(almacenId: string, productoId: string): Promise<Inventario> {

    // Consulta para obtener información del producto específico en el almacén
    const resultado = await this.inventarioRepository.findOne({ where: { almacen: { id: almacenId }, product: { id: productoId } }, relations: ['product'] })


    return resultado

  }

  async obtenerStocksBajos(): Promise<Inventario[]> {
    const inventario = await this.inventarioRepository.find({
      where: { stock: Between(1, 9), product: { is_delete: false } }, //stock<10 
      order: { stock: 'ASC' },
      relations: ['product', 'almacen'],
    });

    return inventario;
  }


  async obtenerProductosAVencer(): Promise<Inventario[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // por claridad, aunque no hace falta por ser date

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    return await this.inventarioRepository.find({
      where: {
        fechaExpiracion: Between(hoy, fechaLimite),
        product: { is_delete: false }
      },
      order: { fechaExpiracion: 'ASC' },
      relations: ['product', 'almacen'],
    });
  }



}
