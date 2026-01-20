import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientosAlmacenService } from './movimientos-almacen.service';
import { CreateAjusteInventarioDto, CreateDetalleAjusteDto } from '../dto/ajuste-inventario.dto';
import { AjusteInventario } from '../entities/ajustes-inventario.entity';
import { DetalleAjuste } from '../entities/detalle-ajuste.entity';
import { InventarioService } from '../inventario.service';
import { DataSource } from 'typeorm';
import { AjusteUnitarioDto } from '../dto/ajuste-unitario.dto';
import { AlmacenesService } from 'src/almacenes/almacenes.service';

@Injectable()
export class AjustesInventario {
  constructor(
    @InjectRepository(AjusteInventario)
    private readonly ajusteInventarioRepository: Repository<AjusteInventario>,
    @InjectRepository(DetalleAjuste)
    private readonly detalleAjusteRepository: Repository<DetalleAjuste>,
    private readonly movimientosService: MovimientosAlmacenService,
    private readonly inventarioService: InventarioService,
    private readonly almacenesService: AlmacenesService,
    private readonly dataSource: DataSource

  ) { }


  async modificarStock(ajustUnit: AjusteUnitarioDto) {
    const { cantidad, glosa, productoId, tipo, almacen, sku } = ajustUnit;

    // Obtener inventario actual
    const inv = await this.inventarioService.obtenerProductoPorAlmacenYProducto(almacen, productoId);

    if (!inv) throw new NotFoundException('Inventario no encontrado');

    let costoUnit = inv.costoUnit;

    if (tipo === 'Aumento') {

      // Ingreso en inventario
      await this.inventarioService.agregarStock({
        almacenId: almacen,
        cantidad,
        productoId,
        sku,
        costoUnit: Number(costoUnit.toFixed(4)),
      });

      // Registrar movimiento
      await this.movimientosService.registrarIngreso({
        almacenId: almacen,
        cantidad,
        productoId,
        descripcion: glosa,
        sku,
        costoUnit: Number(costoUnit.toFixed(4)),
      });

    } else {
      // Salida de inventario → siempre se toma el PPP actual
      await this.inventarioService.descontarStock({
        almacenId: almacen,
        cantidad,
        productoId,
        sku,
        costoUnit: Number(costoUnit.toFixed(4)),
      });

      await this.movimientosService.registrarSalida({
        almacenId: almacen,
        cantidad,
        productoId,
        descripcion: glosa,
        sku,
        costoUnit: Number(costoUnit.toFixed(4)),
      });
    }
  }


  async obtenerAjustes() {
    const ajustes = await this.ajusteInventarioRepository
      .createQueryBuilder('ajuste')
      .leftJoinAndSelect('ajuste.detalles', 'detalle') // JOIN con la tabla de detalles
      .leftJoinAndSelect('ajuste.almacen', 'almacen') // JOIN con la tabla de almacenes
      .leftJoinAndSelect('ajuste.usuario', 'usuario') // JOIN con la tabla de usuarios
      .select([
        'ajuste.id',
        'ajuste.codigo',
        'ajuste.glosa',
        'ajuste.fecha',
        'almacen.id',
        'almacen.nombre',
        'almacen.ubicacion',
        'usuario.id',
        'usuario.fullName',
        'detalle.id',
        'detalle.producto_id',
        'detalle.cantidad',
        'detalle.codigo_barras',
      ])
      .getMany();

    return ajustes.map((ajuste) => ({
      id: ajuste.id,
      glosa: ajuste.glosa,
      fecha: ajuste.fecha,
      codigo: ajuste.codigo,
      almacen: {
        id: ajuste.almacen?.id,
        nombre: ajuste.almacen?.nombre,
      },
      usuario: {
        id: ajuste.usuario?.id,
        nombre: ajuste.usuario?.fullName,
      },
      detalles: ajuste.detalles.map((detalle) => ({
        id: detalle.id,
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        codigo_barras: detalle.codigo_barras,
      })),
    }));
  }

  async obtenerAjuste(id: string) {
    const ajuste = await this.ajusteInventarioRepository
      .createQueryBuilder('ajuste')
      .leftJoinAndSelect('ajuste.detalles', 'detalle')
      .leftJoinAndSelect('detalle.producto', 'producto')
      .leftJoinAndSelect('ajuste.almacen', 'almacen')
      .leftJoinAndSelect('ajuste.usuario', 'usuario')
      .leftJoin(
        'inventario',
        'inventario',
        'inventario.codigo_barras = detalle.codigo_barras AND inventario.almacen = almacen.id'
      )
      .select([
        'ajuste.id',
        'ajuste.glosa',
        'ajuste.fecha',
        'almacen.id',
        'almacen.nombre',
        'usuario.id',
        'usuario.fullName',
        'detalle.id',
        'detalle.cantidad',
        'detalle.codigo_barras',
        'detalle.unidad_medida',
        'detalle.tipo',
        'producto.id',
        'producto.alias',
        'producto.descripcion',
        'producto.sku',
        'producto.codigo',
        'inventario.stock AS detalle_stock',
      ])
      .where('ajuste.id = :id', { id })
      .getRawAndEntities();


    const entity = ajuste.entities[0]; // Accede al primer elemento de entities

    if (!entity) {
      throw new Error(`No se encontró un ajuste con el ID "${id}".`);
    }

    return {
      id: entity.id,
      glosa: entity.glosa,
      fecha: entity.fecha,
      almacen: {
        id: entity.almacen?.id,
        nombre: entity.almacen?.nombre,
      },
      usuario: {
        id: entity.usuario?.id,
        nombre: entity.usuario?.fullName,
      },
      detalles: entity.detalles.map((detalle, index) => ({
        id: detalle.id,
        id_producto: detalle.producto.id,
        alias: detalle.producto.nombre,
        cantidad: detalle.cantidad,
        codigo: detalle.producto.codigo,
        codigo_barras: detalle.codigo_barras,
        unidad_medida: detalle.unidad_medida,
        tipo: detalle.tipo,
        stock: ajuste.raw[index]?.detalle_stock || 0,
      })),
    };
  }




}
