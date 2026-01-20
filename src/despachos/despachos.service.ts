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

      // Crear traspaso
      const traspasoNuevo = queryRunner.manager.create(Traspaso, {
        responsable: { id: user },
        almacenOrigen: almaceOrigen,
        almacenDestino: almaceDestino,
        fecha,
        glosa,
      });
      const traspasoGuardado = await queryRunner.manager.save(Traspaso, traspasoNuevo);

      for (const element of detalles) {
        const inventarioOrigen = await queryRunner.manager.findOne(Inventario, {
          where: { id: element.id_inventario },
          relations: ['product'],
        });

        if (!inventarioOrigen) throw new NotFoundException('No se encontró el inventario');

        const cantidad = Number(element.cantidad);
        const costoUnitOrigen = inventarioOrigen.costoUnit;

        // -----------------------------
        // Descontar del almacén origen
        // -----------------------------
        await this.inventarioService.descontarStockTransaccional({
          almacenId: almaceOrigen.id,
          cantidad,
          productoId: inventarioOrigen.product.id,
          sku: inventarioOrigen.sku,
          costoUnit: costoUnitOrigen, // usar PPP origen
        }, queryRunner);

        await this.movimientosService.registrarSalidaTransaccional({
          almacenId: almaceOrigen.id,
          cantidad,
          productoId: inventarioOrigen.product.id,
          descripcion: `Traslado a ${almaceDestino.nombre}`,
          sku: inventarioOrigen.sku,
          costoUnit: costoUnitOrigen,
        }, queryRunner);

        // -----------------------------
        // Agregar al almacén destino
        // -----------------------------
        let inventarioDestino = await queryRunner.manager.findOne(Inventario, {
          where: { almacen: { id: almaceDestino.id }, product: { id: inventarioOrigen.product.id } },
        });

        let costoUnitDestino = costoUnitOrigen;

        if (inventarioDestino) {
          // Recalcular PPP si ya había stock
          costoUnitDestino = (
            inventarioDestino.stock * inventarioDestino.costoUnit +
            cantidad * costoUnitOrigen
          ) / (inventarioDestino.stock + cantidad);
        }

        await this.inventarioService.agregarStockTransaccional({
          almacenId: almaceDestino.id,
          cantidad,
          productoId: inventarioOrigen.product.id,
          sku: inventarioOrigen.sku,
          costoUnit: Number(costoUnitDestino.toFixed(4)),
        }, queryRunner);

        await this.movimientosService.registrarIngresoTransaccional({
          almacenId: almaceDestino.id,
          cantidad,
          productoId: inventarioOrigen.product.id,
          descripcion: `Traslado desde ${almaceOrigen.nombre}`,
          sku: inventarioOrigen.sku,
          costoUnit: Number(costoUnitDestino.toFixed(4)),
        }, queryRunner);

        // -----------------------------
        // Guardar detalle del traspaso
        // -----------------------------
        const detalleTraspaso = queryRunner.manager.create(DetalleTraspaso, {
          inventario: inventarioOrigen,
          cantidad,
          traspaso: traspasoGuardado,
          costoUnit: costoUnitOrigen
        });

        await queryRunner.manager.save(DetalleTraspaso, detalleTraspaso);
      }

      await queryRunner.commitTransaction();
      return traspasoGuardado;
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('No se pudo crear el traspaso');
    } finally {
      await queryRunner.release();
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

      // 1️⃣ Obtener traspaso original
      const traspasoExistente = await queryRunner.manager.findOne(Traspaso, {
        where: { id },
        relations: ['detalles', 'detalles.inventario', 'almacenOrigen', 'almacenDestino'],
      });

      if (!traspasoExistente) throw new NotFoundException(`Traspaso no encontrado`);

      // 2️⃣ Revertir los stocks originales
      for (const detalle of traspasoExistente.detalles) {
        const inv = await queryRunner.manager.findOne(Inventario, { where: { id: detalle.inventario.id }, relations: ['product'] });
        if (!inv) continue;

        // Revertir en origen
        await this.inventarioService.agregarStockTransaccional({
          almacenId: traspasoExistente.almacenOrigen.id,
          cantidad: detalle.cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          costoUnit: detalle.costoUnit,
          fechaExpiracion: inv.fechaExpiracion,
        }, queryRunner);

        // Revertir en destino
        await this.inventarioService.descontarStockTransaccional({
          almacenId: traspasoExistente.almacenDestino.id,
          cantidad: detalle.cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          costoUnit: detalle.costoUnit,
        }, queryRunner);

        // Movimientos de reversión
        await this.movimientosService.registrarIngresoTransaccional({
          almacenId: traspasoExistente.almacenOrigen.id,
          cantidad: detalle.cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          descripcion: 'Reversión por edición de traspaso',
          costoUnit: detalle.costoUnit,
        }, queryRunner);

        await this.movimientosService.registrarSalidaTransaccional({
          almacenId: traspasoExistente.almacenDestino.id,
          cantidad: detalle.cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          descripcion: 'Reversión por edición de traspaso',
          costoUnit: detalle.costoUnit,
        }, queryRunner);
      }

      // 3️⃣ Actualizar cabecera
      traspasoExistente.almacenOrigen = { id: almacenOrigen } as any;
      traspasoExistente.almacenDestino = { id: almacenDestino } as any;
      traspasoExistente.fecha = fecha;
      traspasoExistente.glosa = glosa;
      await queryRunner.manager.save(Traspaso, traspasoExistente);

      // 4️⃣ Eliminar detalles antiguos
      await queryRunner.manager.delete(DetalleTraspaso, { traspaso: { id } });

      // 5️⃣ Procesar detalles nuevos
      for (const element of detalles) {
        const inv = await queryRunner.manager.findOne(Inventario, { where: { id: element.id_inventario }, relations: ['product'] });
        if (!inv) throw new NotFoundException(`Inventario con ID ${element.id_inventario} no existe`);

        const cantidad = Number(element.cantidad);
        const costoUnitOrigen = inv.costoUnit;

        // Descontar del nuevo origen
        await this.inventarioService.descontarStockTransaccional({
          almacenId: almacenOrigen,
          cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          costoUnit: costoUnitOrigen,
        }, queryRunner);

        // Agregar al nuevo destino y recalcular PPP si ya hay stock
        let invDestino = await queryRunner.manager.findOne(Inventario, { where: { almacen: { id: almacenDestino }, product: { id: inv.product.id } } });
        let costoUnitDestino = costoUnitOrigen;

        if (invDestino && invDestino.stock > 0) {
          costoUnitDestino = (
            invDestino.stock * invDestino.costoUnit +
            cantidad * costoUnitOrigen
          ) / (invDestino.stock + cantidad);
        }

        await this.inventarioService.agregarStockTransaccional({
          almacenId: almacenDestino,
          cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          costoUnit: Number(costoUnitDestino.toFixed(4)),
          fechaExpiracion: inv.fechaExpiracion,
        }, queryRunner);

        // Registrar movimientos
        await this.movimientosService.registrarSalidaTransaccional({
          almacenId: almacenOrigen,
          cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          descripcion: 'Traspaso actualizado',
          costoUnit: costoUnitOrigen,
        }, queryRunner);

        await this.movimientosService.registrarIngresoTransaccional({
          almacenId: almacenDestino,
          cantidad,
          productoId: inv.product.id,
          sku: inv.sku,
          descripcion: 'Traspaso actualizado',
          costoUnit: Number(costoUnitDestino.toFixed(4)),
        }, queryRunner);

        // Guardar detalle
        const detalleTraspaso = queryRunner.manager.create(DetalleTraspaso, {
          cantidad,
          inventario: { id: inv.id },
          traspaso: { id: traspasoExistente.id },
        });
        await queryRunner.manager.save(DetalleTraspaso, detalleTraspaso);
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
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
            costoUnit: inventario.costoUnit
          }, queryRunner);
          //registrar movimiento ingreso
          await this.movimientosService.registrarIngresoTransaccional({
            almacenId: traspaso.almacenOrigen.id,
            cantidad: detalle.cantidad,
            sku: inventario.sku,
            productoId: inventario.product.id,
            descripcion: 'Traslado Eliminado',
            costoUnit: inventario.costoUnit

          }, queryRunner)

          await this.inventarioService.descontarStockTransaccional({
            almacenId: traspaso.almacenDestino.id,
            cantidad: detalle.cantidad,
            sku: inventario.sku,
            productoId: inventario.product.id,
            costoUnit: inventario.costoUnit
          }, queryRunner);
          //registrar movimiento salida
          await this.movimientosService.registrarSalidaTransaccional({
            almacenId: traspaso.almacenDestino.id,
            cantidad: detalle.cantidad,
            sku: inventario.sku,
            productoId: inventario.product.id,
            descripcion: 'Traslado Eliminado',
            costoUnit: inventario.costoUnit
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
