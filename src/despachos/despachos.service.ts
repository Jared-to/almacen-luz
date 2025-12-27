import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Almacen } from 'src/almacenes/entities/almacen.entity';
import { InventarioService } from 'src/inventario/inventario.service';
import { Inventario } from 'src/inventario/entities/inventario.entity';
import { DetalleTraspaso } from './entities/detalleTraspaso.entity';
import { MovimientosAlmacenService } from 'src/inventario/service/movimientos-almacen.service';
import { CreateTraspasoDto } from './dto/create-despacho.dto';
import { Traspaso } from './entities/despacho.entity';
import { UpdateDespachoDto } from './dto/update-despacho.dto';

@Injectable()
export class TraspasosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventarioService: InventarioService,
    private readonly movimientosService: MovimientosAlmacenService,

  ) { }
  async create(createTraspasoDto: CreateTraspasoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { detalles, almacenDestino, almacenOrigen, fecha, glosa, user } = createTraspasoDto;

      // Buscar almacenes
      const almaceOrigen = await queryRunner.manager.findOne(Almacen, { where: { id: almacenOrigen } });
      const almaceDestino = await queryRunner.manager.findOne(Almacen, { where: { id: almacenDestino } });

      if (!almaceOrigen || !almaceDestino) {
        throw new NotFoundException('No se encuentra el Almacén');
      }

      // Crear el traspaso, pero aún no guardar los detalles
      const traspasoNuevo = queryRunner.manager.create(Traspaso, {
        responsable: { id: user },
        almacenOrigen: almaceOrigen,
        almacenDestino: almaceDestino,
        fecha,
        glosa,
      });

      // Guardar el traspaso para obtener el ID
      const traspasoGuardado = await queryRunner.manager.save(Traspaso, traspasoNuevo);

      // Procesar los detalles
      for (const element of detalles) {
        const inventario = await queryRunner.manager.findOne(Inventario, {
          where: { id: element.id_inventario },
          relations: ['product'],
        });

        if (!inventario) {
          throw new NotFoundException('No se encontró el inventario');
        }

        // Registrar stocks y movimientos
        await this.inventarioService.agregarStockTransaccional({
          almacenId: almaceDestino.id,
          cantidad: Number(element.cantidad),
          productoId: inventario.product.id,
          sku: inventario.sku,
          fechaExpiracion: inventario.fechaExpiracion,
        }, queryRunner);

        await this.movimientosService.registrarIngresoTransaccional({
          almacenId: almaceDestino.id,
          cantidad: Number(element.cantidad),
          productoId: inventario.product.id,
          descripcion: 'Traslado',
          sku: inventario.sku
        }, queryRunner);

        await this.inventarioService.descontarStockTransaccional({
          almacenId: almaceOrigen.id,
          cantidad: Number(element.cantidad),
          productoId: inventario.product.id,
          sku: inventario.sku
        }, queryRunner);

        await this.movimientosService.registrarSalidaTransaccional({
          almacenId: almaceOrigen.id,
          cantidad: Number(element.cantidad),
          productoId: inventario.product.id,
          descripcion: 'Traslado',
          sku: inventario.sku
        }, queryRunner);

        // Crear detalles relacionados al traspaso guardado
        const detalleTraspaso = queryRunner.manager.create(DetalleTraspaso, {
          inventario,
          cantidad: element.cantidad,
          traspaso: traspasoGuardado, // Usar el traspaso guardado con ID
        });

        await queryRunner.manager.save(DetalleTraspaso, detalleTraspaso);
      }

      await queryRunner.commitTransaction(); // Confirmar la transacción
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('No se pudo crear el traspaso');
    } finally {
      await queryRunner.release(); // Liberar el QueryRunner
    }
  }


  async findAll(): Promise<Traspaso[]> {
    try {
      return await this.dataSource.getRepository(Traspaso).find({
        relations: ['almacenOrigen', 'almacenDestino', 'detalles', 'responsable'],
      });
    } catch (error) {
      throw new InternalServerErrorException(`No se pudieron obtener los traspasos: ${error.message}`);
    }
  }


  async findOne(id: string): Promise<Traspaso> {
    try {
      const traspaso = await this.dataSource.getRepository(Traspaso).findOne({
        where: { id },
        relations: ['almacenOrigen', 'almacenDestino', 'detalles', 'detalles.inventario', 'detalles.inventario.product', 'detalles.inventario.product.categoria', 'responsable'],
      });

      if (!traspaso) {
        throw new NotFoundException(`El traspaso con ID ${id} no existe`);
      }

      return traspaso;
    } catch (error) {
      throw new InternalServerErrorException(`Error al obtener el traspaso con ID ${id}: ${error.message}`);
    }
  }

  async update(id: string, updateTraspasoDto: UpdateDespachoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { detalles, almacenDestino, almacenOrigen, fecha, glosa } = updateTraspasoDto;

      // 1. Obtener traspaso original
      const traspasoExistente = await queryRunner.manager.findOne(Traspaso, {
        where: { id },
        relations: ['detalles', 'detalles.inventario', 'almacenOrigen', 'almacenDestino', 'responsable'],
      });

      if (!traspasoExistente) {
        throw new NotFoundException(`El traspaso con ID ${id} no existe`);
      }

      // 2. Validar almacenes nuevos
      const almacenOrigenEntity = await queryRunner.manager.findOne(Almacen, { where: { id: almacenOrigen } });
      const almacenDestinoEntity = await queryRunner.manager.findOne(Almacen, { where: { id: almacenDestino } });

      if (!almacenOrigenEntity) throw new NotFoundException(`El almacén origen con ID ${almacenOrigen} no existe`);
      if (!almacenDestinoEntity) throw new NotFoundException(`El almacén destino con ID ${almacenDestino} no existe`);

      // 3. Revertir stocks de los detalles anteriores
      for (const detalle of traspasoExistente.detalles) {

        const inventario = await queryRunner.manager.findOne(Inventario, {
          where: { id: detalle.inventario.id },
          relations: ['product'],
        });
        if (!inventario) continue;

        // Revertir stock
        await this.inventarioService.agregarStockTransaccional({
          almacenId: traspasoExistente.almacenOrigen.id,
          cantidad: detalle.cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
          fechaExpiracion: inventario.fechaExpiracion,
        }, queryRunner);

        await this.inventarioService.descontarStockTransaccional({
          almacenId: traspasoExistente.almacenDestino.id,
          cantidad: detalle.cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
        }, queryRunner);

        // Registrar movimientos de reversión
        await this.movimientosService.registrarIngresoTransaccional({
          almacenId: traspasoExistente.almacenOrigen.id,
          cantidad: detalle.cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
          descripcion: 'Reversión por edición de traspaso'
        }, queryRunner);

        await this.movimientosService.registrarSalidaTransaccional({
          almacenId: traspasoExistente.almacenDestino.id,
          cantidad: detalle.cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
          descripcion: 'Reversión por edición de traspaso'
        }, queryRunner);
      }

      // 4. Actualizar datos principales
      traspasoExistente.almacenOrigen = almacenOrigenEntity;
      traspasoExistente.almacenDestino = almacenDestinoEntity;
      traspasoExistente.fecha = fecha;
      traspasoExistente.glosa = glosa;

      await queryRunner.manager.save(Traspaso, traspasoExistente);

      // 5. Eliminar detalles antiguos
      await queryRunner.manager.delete(DetalleTraspaso, { traspaso: { id } });

      // 6. Crear los detalles nuevos
      for (const element of detalles) {

        const inventario = await queryRunner.manager.findOne(Inventario, {
          where: { id: element.id_inventario },
          relations: ['product'],
        });

        if (!inventario) {
          throw new NotFoundException(`El inventario con ID ${element.id_inventario} no existe`);
        }

        const cantidad = Number(element.cantidad);

        // Descontar del nuevo origen
        await this.inventarioService.descontarStockTransaccional({
          almacenId: almacenOrigenEntity.id,
          cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
        }, queryRunner);

        // Agregar al nuevo destino
        await this.inventarioService.agregarStockTransaccional({
          almacenId: almacenDestinoEntity.id,
          cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
          fechaExpiracion: inventario.fechaExpiracion,
        }, queryRunner);

        // Movimientos
        await this.movimientosService.registrarSalidaTransaccional({
          almacenId: almacenOrigenEntity.id,
          cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
          descripcion: `Traspaso actualizado`
        }, queryRunner);

        await this.movimientosService.registrarIngresoTransaccional({
          almacenId: almacenDestinoEntity.id,
          cantidad,
          sku: inventario.sku,
          productoId: inventario.product.id,
          descripcion: `Traspaso actualizado`
        }, queryRunner);

        // Crear nuevo detalle
        const detalleTraspaso = queryRunner.manager.create(DetalleTraspaso, {
          ...element,
          inventario: { id: inventario.id },
          traspaso: { id: traspasoExistente.id },
        });

        await queryRunner.manager.save(DetalleTraspaso, detalleTraspaso);
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`No se pudo actualizar el traspaso: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }


  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const traspaso = await queryRunner.manager.findOne(Traspaso, {
        where: { id },
        relations: ['detalles', 'detalles.inventario', 'detalles.inventario.product', 'almacenOrigen', 'almacenDestino'],
      });

      if (!traspaso) {
        throw new NotFoundException(`El traspaso con ID ${id} no existe`);
      }

      // Restaurar stocks de los detalles
      for (const detalle of traspaso.detalles) {
        const inventario = detalle.inventario;

        if (inventario) {
          await this.inventarioService.agregarStockTransaccional({
            almacenId: traspaso.almacenOrigen.id,
            cantidad: detalle.cantidad,
            sku: inventario.sku,
            productoId: inventario.product.id,
            fechaExpiracion: inventario.fechaExpiracion,
          }, queryRunner);
          //registrar movimiento ingreso
          await this.movimientosService.registrarIngresoTransaccional({
            almacenId: traspaso.almacenOrigen.id,
            cantidad: detalle.cantidad,
            sku: inventario.sku,
            productoId: inventario.product.id,
            descripcion: 'Traslado Eliminado'
          }, queryRunner)

          await this.inventarioService.descontarStockTransaccional({
            almacenId: traspaso.almacenDestino.id,
            cantidad: detalle.cantidad,
            sku: inventario.sku,
            productoId: inventario.product.id,
          }, queryRunner);
          //registrar movimiento salida
          await this.movimientosService.registrarSalidaTransaccional({
            almacenId: traspaso.almacenDestino.id,
            cantidad: detalle.cantidad,
            sku: inventario.sku,
            productoId: inventario.product.id,
            descripcion: 'Traslado Eliminado'
          }, queryRunner)
        }
      }

      // Eliminar los detalles
      await queryRunner.manager.delete(DetalleTraspaso, { traspaso: { id } });

      // Eliminar el traspaso
      await queryRunner.manager.delete(Traspaso, { id });

      await queryRunner.commitTransaction();
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`No se pudo eliminar el traspaso con ID ${id}: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

}
