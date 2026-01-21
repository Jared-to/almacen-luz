import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, QueryRunner, Raw } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { InventarioService } from 'src/inventario/inventario.service';
import { MovimientosAlmacenService } from 'src/inventario/service/movimientos-almacen.service';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { Cliente } from 'src/clientes/entities/cliente.entity';
import * as moment from 'moment-timezone';
import { User } from 'src/auth/entities/user.entity';
import { ClientesService } from 'src/clientes/clientes.service';
import { Inventario } from 'src/inventario/entities/inventario.entity';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private readonly detallesRepository: Repository<DetalleVenta>,
    private readonly inventarioService: InventarioService,
    private readonly movimientosService: MovimientosAlmacenService,
    private readonly dataSource: DataSource,
    private readonly clienteService: ClientesService,
    private readonly notificationsService: NotificacionesService,
    private readonly eventEmitter: EventEmitter2,


  ) { }

  async create(createVentaDto: CreateVentaDto): Promise<Venta> {
    const queryRunner = this.dataSource.createQueryRunner();

    // Iniciar la transacción
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { detalles, almacen, ...ventaData } = createVentaDto;

      // Crear y guardar la venta
      const venta = queryRunner.manager.create(Venta, {
        ...ventaData,
        caja: { id: ventaData.cajaId },
        almacen: { id: almacen },
        fecha: moment(ventaData.fecha).tz("America/La_Paz").toDate(),
        vendedor: { id: ventaData.vendedor },
        nombreCliente: ventaData.cliente,
      });


      const ventaGuardada1 = await queryRunner.manager.save(Venta, venta);


      // Validar si 'increment' existe, aunque debería ser garantizado por la base de datos
      if (!ventaGuardada1.increment) {
        ventaGuardada1.increment = 1; // En caso de que sea nulo por algún motivo
      }

      // Generar el código basado en el increment
      ventaGuardada1.codigo = `V${ventaGuardada1.increment.toString().padStart(4, '0')}`;

      // Guardar nuevamente el cliente con el código generado
      const ventaGuardada = await queryRunner.manager.save(Venta, ventaGuardada1);


      if (!detalles || detalles.length === 0) {
        throw new NotFoundException('Debe incluir al menos un detalle en la venta');
      }


      // Crear y guardar los detalles de la venta

      for (const detalle of detalles) {
        const inventario = await queryRunner.manager.findOne(Inventario, { where: { id: detalle.id_inventario }, relations: ['product'] })

        const deta = queryRunner.manager.create(DetalleVenta, {
          inventario: { id: inventario.id },
          cantidad: detalle.cantidad,
          precio: detalle.precio,
          subtotal: detalle.subtotal,
          unidad_medida: detalle.unidad_medida,
          nombreProducto: inventario.product.nombre,
          marca: inventario.product.marca,
          venta: ventaGuardada,
        });
        // Guardar los detalles de la venta con el query runner
        const detalleG = await queryRunner.manager.save(DetalleVenta, deta);

        await this.registrarMovimiento(detalleG, inventario.product.id, 'venta', `Venta - ${ventaGuardada.codigo}`, almacen, detalle.sku, queryRunner);

      }

      //Crear cliente 

      const cliente = await queryRunner.manager.findOne(Cliente, { where: { nombre: createVentaDto.cliente } });

      if (cliente) {
        await this.clienteService.create({
          nombre: createVentaDto.cliente
        })
      }

      // Confirmar la transacción
      await queryRunner.commitTransaction();

      this.notificationsService.sendEvent({
        type: 'ventaCreada',
        payload: {
          rol: 'admin',
          tipo: 'venta',
          mensaje: `Nueva Venta - ${ventaGuardada?.codigo} - ${createVentaDto.cliente}`,
          fecha: ventaGuardada.fecha,
        },
      });
      // --- ENVÍO DEL MENSAJE ---
      const mensaje = `🛒 *Comercio.bo*  
✨ ¡Se realizó una *nueva venta*! ✨

👤 Cliente: *${venta.nombreCliente || 'Desconocido'}*  
💰 Total: *${venta.total.toFixed(2)} Bs*  
🆔 Código: *${venta.codigo}*  
📅 Fecha: *${new Date(venta.fecha).toLocaleString()}*
Revisa en *https://almacen-luz.comercio.bo*
✅ Revisa los detalles en tu panel.`;

      // Emitir evento asíncrono SIN bloquear la respuesta
      this.eventEmitter.emitAsync('venta.creada', {
        numero: process.env.WSP_NUM,
        mensaje,
      });

      // Retornar la venta con los detalles
      return (ventaGuardada);
    } catch (error) {
      console.log(error);

      // Revertir la transacción en caso de error
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('No se pudo crear la venta');
    } finally {
      // Liberar el queryRunner
      await queryRunner.release();
    }
  }

  async update(id: string, updateVentaDto: UpdateVentaDto): Promise<Venta> {
    const queryRunner = this.ventasRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { detalles: nuevosDetalles, almacen: nuevoAlmacenId, ...ventaData } = updateVentaDto;

      // Cargamos la venta dentro del queryRunner con todas las relaciones necesarias
      const venta = await queryRunner.manager.findOne(Venta, {
        where: { id },
        relations: [
          'detalles',
          'detalles.inventario',
          'detalles.inventario.product',
          'almacen'
        ]
      });

      if (!venta) throw new NotFoundException('Venta no encontrada.');

      const detallesAnteriores = venta.detalles || [];
      const almacenAnteriorId = venta.almacen?.id ? String(venta.almacen.id) : null;
      const almacenNuevoId = nuevoAlmacenId ? String(nuevoAlmacenId) : null;

      const cambioDeAlmacen = almacenAnteriorId && almacenNuevoId && almacenAnteriorId !== almacenNuevoId;

      if (cambioDeAlmacen) {
        // Si cambia de almacén: devolver todo al almacén anterior y eliminar los detalles antiguos
        for (const detalleAnterior of detallesAnteriores) {
          // Registrar devolución al almacén anterior
          await this.registrarMovimiento(
            detalleAnterior,
            detalleAnterior.inventario.product.id,
            'devolucion',
            `Cambio de almacén - ${venta.codigo}`,
            almacenAnteriorId,
            detalleAnterior.inventario.sku,
            queryRunner
          );

          // Borrar el detalle anterior (ya se devolvió)
          await queryRunner.manager.delete(DetalleVenta, detalleAnterior.id);
        }

        // Limpiar array para que TypeORM no lo vuelva a persistir
        venta.detalles = [];
      } else {
        // Si NO cambia de almacén: comportamiento previo (eliminar detalles eliminados / ajustar cantidades)
        for (const detalleAnterior of detallesAnteriores) {
          const detalleNuevo = (nuevosDetalles || []).find(d => String(d.id_inventario) === String(detalleAnterior.inventario.id));

          if (!detalleNuevo) {
            // Si no está en los nuevos detalles, eliminarlo y devolver al inventario del mismo almacén
            await this.registrarMovimiento(
              detalleAnterior,
              detalleAnterior.inventario.product.id,
              'devolucion',
              `Ajuste Venta - ${venta.codigo}`,
              almacenAnteriorId,
              detalleAnterior.inventario.sku,
              queryRunner
            );
            await queryRunner.manager.delete(DetalleVenta, detalleAnterior.id);

            venta.detalles = venta.detalles.filter((d) => d.id !== detalleAnterior.id);
          } else if (detalleAnterior.cantidad !== detalleNuevo.cantidad) {
            // Si cambió la cantidad: devolver lo anterior y eliminar el detalle para re-crear después
            await this.registrarMovimiento(
              detalleAnterior,
              detalleAnterior.inventario.product.id,
              'devolucion',
              `Ajuste Venta - ${venta.codigo}`,
              almacenAnteriorId,
              detalleAnterior.inventario.sku,
              queryRunner
            );
            await queryRunner.manager.delete(DetalleVenta, detalleAnterior.id);

            venta.detalles = venta.detalles.filter((d) => d.id !== detalleAnterior.id);
          }
        }
      }

      // Actualizar campos de la venta (se actualiza el almacen al nuevo)
      Object.assign(venta, {
        total: ventaData.total,
        montoRecibido: ventaData?.montoRecibido || null,
        subtotal: ventaData.subtotal,
        descuento: ventaData.descuento,
        tipo_pago: ventaData.tipo_pago,
        nombreCliente: ventaData.cliente,
        montoEfectivo: ventaData.montoEfectivo || null,
        montoQR: ventaData.montoQR || null,
        fechaEdit: moment().tz("America/La_Paz").toDate(),
        almacen: { id: almacenNuevoId }
      });

      const ventaActualizada = await queryRunner.manager.save(Venta, venta);

      // Agregar o actualizar los nuevos detalles
      for (const detalleNuevo of (nuevosDetalles || [])) {
        // Si hubo cambio de almacén, todos los detalles anteriores se borraron así que siempre los creamos de nuevo.
        // Si NO hubo cambio de almacén, comprobamos si ya existe un detalle con misma inventario y misma cantidad.
        const existeYNoCambiar =
          !cambioDeAlmacen &&
          detallesAnteriores.find(
            d => String(d.inventario.id) === String(detalleNuevo.id_inventario) && d.cantidad === detalleNuevo.cantidad
          );

        if (!existeYNoCambiar) {
          const inventario = await queryRunner.manager.findOne(Inventario, {
            where: { id: detalleNuevo.id_inventario },
            relations: ['product']
          });

          if (!inventario) {
            throw new NotFoundException('El producto enviado no fue encontrado.');
          }

          const detalleG = queryRunner.manager.create(DetalleVenta, {
            venta: { id: ventaActualizada.id },
            ...detalleNuevo,
            inventario: { id: inventario.id },
            nombreProducto: inventario.product.nombre,
            marca: inventario.product.marca,
          });

          const detalleGuardado = await queryRunner.manager.save(detalleG);

          // Registrar salida desde el nuevo almacén (si cambio de almacén, debe salir desde el nuevo; si no cambio, sale desde el mismo almacen enviado en DTO)
          await this.registrarMovimiento(
            detalleGuardado,
            inventario.product.id,
            'venta',
            `Ajuste Venta - ${ventaActualizada.codigo}`,
            almacenNuevoId,
            detalleNuevo.sku,
            queryRunner
          );
        }
      }

      await queryRunner.commitTransaction();
      return ventaActualizada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateFecha(id: string, fecha: Date): Promise<Venta> {

    const queryRunner = this.ventasRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Buscar la venta dentro del contexto de la transacción
      const venta = await queryRunner.manager.findOne(Venta, {
        where: { id },
      });

      if (!venta) {
        throw new NotFoundException('Venta no encontrada.');
      }

      // Actualizar fecha con zona horaria de Bolivia
      venta.fecha = moment(fecha).tz('America/La_Paz').toDate();

      // Guardar cambios
      const ventaActualizada = await queryRunner.manager.save(Venta, venta);

      await queryRunner.commitTransaction();
      return ventaActualizada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllDates(fechaInicio: string | 'xx', fechaFin: string | 'xx', user: User): Promise<Venta[]> {

    const isAdmin = user?.roles?.some(role => role === 'admin') ?? false;

    // Si ambas fechas son 'xx', obtenemos todas las ventas
    if (fechaInicio === 'xx' && fechaFin === 'xx') {
      return this.ventasRepository.find({
        where: user && !isAdmin ? { vendedor: { id: user.id } } : {},
        relations: ['almacen', 'detalles', 'detalles.inventario', 'detalles.inventario.product', 'detalles.inventario.product.categoria', 'vendedor', 'caja'],
      });
    }

    const whereConditions: any = {};
    if (user && !isAdmin) {
      whereConditions.vendedor = { id: user.id };
    }

    const fechaInicioFormat = (fechaInicio);
    const fechaFinFormat = (fechaFin);

    if (fechaInicioFormat && fechaFinFormat) {
      whereConditions.fecha = Raw(alias => `
      DATE(${alias}) BETWEEN DATE('${fechaInicioFormat}') AND DATE('${fechaFinFormat}')
    `);
    } else if (fechaInicioFormat) {
      whereConditions.fecha = Raw(alias => `
      DATE(${alias}) >= DATE('${fechaInicioFormat}')
    `);
    } else if (fechaFinFormat) {
      whereConditions.fecha = Raw(alias => `
      DATE(${alias}) <= DATE('${fechaFinFormat}')
    `);
    }

    return this.ventasRepository.find({
      where: whereConditions,
      relations: ['almacen', 'detalles', 'detalles.inventario', 'detalles.inventario.product', 'detalles.inventario.product.categoria', 'vendedor', 'caja'],
    });
  }



  async findOne(id: string): Promise<Venta> {
    const venta = await this.ventasRepository.findOne({
      where: { id },
      relations: ['almacen', 'detalles', 'detalles.inventario', 'detalles.inventario.product', 'detalles.inventario.product.categoria', 'vendedor', 'caja'],
    });


    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }
    return venta;
  }


  async findOneEdit(id: string): Promise<Venta> {
    const venta = await this.ventasRepository.findOne({
      where: { id },
      relations: ['almacen', 'detalles', 'detalles.inventario', 'detalles.inventario.product', 'detalles.inventario.product.categoria', 'vendedor'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return venta
  }


  async anularVenta(id: string, id_user: string): Promise<void> {
    const queryRunner = this.ventasRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // Obtener la venta con sus detalles dentro de la transacción
      const venta = await this.findOne(id);
      const usuario = await queryRunner.manager.findOne(User, { where: { id: id_user } });
      if (!usuario) {
        throw new ConflictException('El usuario no fue encontrado.');

      }
      if (!venta.estado) {
        throw new ConflictException('La venta ya fue anulada.')
      }
      // Devolver al inventario los productos de los detalles
      for (const detalle of venta.detalles) {
        await this.registrarMovimiento(
          detalle,
          detalle.inventario.product.id,
          'devolucion',
          'Venta Anulada',
          venta.almacen.id,
          detalle.inventario.sku,
          queryRunner
        );

      }
      venta.estado = false;
      venta.fechaAnulada = moment().tz("America/La_Paz").toDate();
      venta.usuarioAnulador = usuario.fullName;

      // Eliminar la venta y sus detalles (en cascada)
      await queryRunner.manager.save(Venta, venta);

      // Confirmar la transacción
      await queryRunner.commitTransaction();
    } catch (error) {
      // Revertir la transacción en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar el QueryRunner
      await queryRunner.release();
    }
  }

  async restaurarVenta(id: string): Promise<void> {
    const queryRunner = this.ventasRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // Obtener la venta con sus detalles dentro de la transacción
      const venta = await this.findOne(id);

      if (venta.estado) {
        throw new ConflictException('La venta no esta anulada.')
      }
      // Devolver al inventario los productos de los detalles
      for (const detalle of venta.detalles) {

        await this.registrarMovimiento(
          detalle,
          detalle.inventario.product.id,
          'venta',
          'Venta Restaurada',
          venta.almacen.id,
          detalle.inventario.sku,
          queryRunner
        );
      }

      venta.estado = true;
      venta.fechaAnulada = null;
      venta.usuarioAnulador = null;

      // Eliminar la venta y sus detalles (en cascada)
      await queryRunner.manager.save(Venta, venta);

      // Confirmar la transacción
      await queryRunner.commitTransaction();
    } catch (error) {
      // Revertir la transacción en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar el QueryRunner
      await queryRunner.release();
    }
  }
  async remove(id: string): Promise<void> {
    const queryRunner = this.ventasRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // Obtener la venta con sus detalles dentro de la transacción
      const venta = await this.findOne(id);

      if (venta.estado) {
        throw new ConflictException('La venta debe estar anulada para poderla eliminar.')
      }

      // Eliminar la venta y sus detalles (en cascada)
      await queryRunner.manager.remove(Venta, venta);

      // Confirmar la transacción
      await queryRunner.commitTransaction();
    } catch (error) {
      // Revertir la transacción en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar el QueryRunner
      await queryRunner.release();
    }
  }
  async getTopUsedProducts(): Promise<any[]> {
    return this.detallesRepository
      .createQueryBuilder('detalle_venta')
      .select('producto.id', 'productoId')
      .addSelect('SUM(detalle_venta.cantidad)', 'totalCantidad')
      .addSelect('SUM(detalle_venta.subtotal)', 'totalSubtotal')
      .addSelect('producto.nombre', 'productoDescripcion')
      .innerJoin('detalle_venta.inventario', 'inventario')
      .innerJoin('inventario.product', 'producto')
      .groupBy('producto.id')
      .addGroupBy('producto.nombre')
      .orderBy('SUM(detalle_venta.cantidad)', 'DESC')
      .limit(5)
      .getRawMany();
  }



  async getLatestSales(): Promise<Venta[]> {
    return this.ventasRepository.find({
      order: {
        fecha: 'DESC', // Ordena por la fecha en orden descendente
      },
      take: 5, // Limita a las últimas 5 ventas
      relations: ['detalles', 'vendedor'], // Carga relaciones necesarias
    });
  }
  async getSalesCount(): Promise<number> {
    return this.ventasRepository.count(); // Devuelve la cantidad de ventas
  }
  async obtenerDatosVentas(tipo: 'semana' | 'mes' | 'todo') {
    const today = new Date();
    let pData: number[] = [];
    let xLabels: string[] = [];

    if (tipo === 'semana') {
      const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const lunes = new Date(today);
      lunes.setDate(today.getDate() - today.getDay() + 1); // lunes de esta semana

      for (let i = 0; i < 7; i++) {
        const fechaInicio = new Date(lunes);
        fechaInicio.setDate(lunes.getDate() + i);

        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaInicio.getDate() + 1);

        const cantidad = await this.ventasRepository.count({
          where: {
            fecha: Between(fechaInicio, fechaFin),
          },
        });

        pData.push(cantidad);
      }

      xLabels = dias;
    }

    if (tipo === 'mes') {
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const fechaInicio = new Date(year, month, i);
        const fechaFin = new Date(year, month, i + 1);

        const cantidad = await this.ventasRepository.count({
          where: {
            fecha: Between(fechaInicio, fechaFin),
          },
        });

        pData.push(cantidad);
        xLabels.push(i.toString());
      }
    }

    if (tipo === 'todo') {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const year = today.getFullYear();

      for (let m = 0; m < 12; m++) {
        const fechaInicio = new Date(year, m, 1);
        const fechaFin = new Date(year, m + 1, 1);

        const cantidad = await this.ventasRepository.count({
          where: {
            fecha: Between(fechaInicio, fechaFin),
          },
        });

        pData.push(cantidad);
      }

      xLabels = meses;
    }

    return { pData, xLabels };
  }
  private async registrarMovimiento(detalle: DetalleVenta, id_product: string, tipo: string, descripcion: string, almacen: string, sku: string, queryRunner: QueryRunner): Promise<void> {
    const inventario = await this.inventarioService.obtenerProductoPorAlmacenYProducto(almacen, id_product);

    if (tipo === 'venta') {
      const inventarioS = await this.inventarioService.descontarStockTransaccional({
        almacenId: almacen,
        cantidad: detalle.cantidad,
        productoId: id_product,
        sku,
        costoUnit: inventario.costoUnit,
      }, queryRunner);
      await this.movimientosService.registrarSalidaTransaccional({
        almacenId: almacen,
        cantidad: detalle.cantidad,
        productoId: id_product,
        descripcion: descripcion,
        sku,
        costoUnit: inventario.costoUnit,
        inventario: inventarioS
      }, queryRunner);
    } else {
      const inventarioI = await this.inventarioService.agregarStockTransaccional({
        almacenId: almacen,
        cantidad: detalle.cantidad,
        productoId: id_product,
        sku,
        costoUnit: inventario.costoUnit,
      }, queryRunner);
      await this.movimientosService.registrarIngresoTransaccional({
        almacenId: almacen,
        cantidad: detalle.cantidad,
        productoId: id_product,
        descripcion: descripcion,
        sku,
        costoUnit: inventario.costoUnit,
        inventario: inventarioI
      }, queryRunner);
    }
  }
}
