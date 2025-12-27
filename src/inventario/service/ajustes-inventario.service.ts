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


  async create(createAjusteInventarioDto: CreateAjusteInventarioDto): Promise<AjusteInventario> {
    const { almacen_id, fecha, glosa, detalles, id_usuario } = createAjusteInventarioDto;

    // Iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Crear la entidad principal AjusteInventario
      const ajuste = this.ajusteInventarioRepository.create({
        almacen_id,
        fecha,
        glosa,
        id_usuario,
      });

      // Guardar el ajuste en la base de datos dentro de la transacción
      const savedAjuste = await queryRunner.manager.save(ajuste);

      // Validar si 'increment' existe, aunque debería ser garantizado por la base de datos
      if (!savedAjuste.increment) {
        savedAjuste.increment = 1; // En caso de que sea nulo por algún motivo
      }

      // Generar el código basado en el increment
      savedAjuste.codigo = `AJ${savedAjuste.increment.toString().padStart(4, '0')}`;

      // Guardar nuevamente el ajuste con el código generado dentro de la transacción
      await queryRunner.manager.save(savedAjuste);

      // Crear y guardar los detalles asociados
      const detallesToSave = detalles.map((detalleDto) => {
        return this.detalleAjusteRepository.create({
          ajuste_inventario: savedAjuste,
          producto_id: detalleDto.producto_id,
          cantidad: detalleDto.cantidad,
          unidad_medida: detalleDto.unidad_medida,
          tipo: detalleDto.tipo,
        });
      });

      // Guardar los detalles dentro de la transacción
      await queryRunner.manager.save(detallesToSave);

      // Registrar registro de ingreso o salida
      await Promise.all(
        detalles.map((detalle) =>
          this.registrarMovimiento(almacen_id, detalle),
        ),
      );

      // Confirmar la transacción
      await queryRunner.commitTransaction();

      // Retornar el ajuste creado con los detalles
      return this.ajusteInventarioRepository.findOne({
        where: { id: savedAjuste.id },
        relations: ['detalles'],
      });
    } catch (error) {
      // Revertir la transacción en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar el queryRunner
      await queryRunner.release();
    }
  }

  async modificarStock(ajustUnit: AjusteUnitarioDto) {
    const { cantidad, glosa, productoId, tipo, almacen, sku } = ajustUnit;



    if (tipo === 'Aumento') {

      await this.inventarioService.agregarStock({
        almacenId: almacen,
        cantidad: cantidad,
        productoId: productoId,
        sku
      })

      await this.movimientosService.registrarIngreso({
        almacenId: almacen,
        cantidad: cantidad,
        productoId: productoId,
        descripcion: glosa,
        sku
      });
    } else {
      await this.inventarioService.descontarStock({
        almacenId: almacen,
        cantidad: cantidad,
        productoId: productoId,
        sku
      })

      await this.movimientosService.registrarSalida({
        almacenId: almacen,
        cantidad: cantidad,
        productoId: productoId,
        descripcion: glosa,
        sku
      });
    }
  }

  async updateAjuste(id: string, updateDto: CreateAjusteInventarioDto): Promise<AjusteInventario> {
    const { almacen_id, fecha, glosa, detalles, id_usuario } = updateDto;

    // Verificar si el ajuste existe
    const existingAjuste = await this.ajusteInventarioRepository.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!existingAjuste) {
      throw new NotFoundException(`El ajuste con ID "${id}" no fue encontrado.`);
    }

    const movimientosPendientes = [];

    for (const detalleExistente of existingAjuste.detalles) {
      const detalleActualizado = detalles.find(
        (detalle) => detalle.producto_id === detalleExistente.producto_id
      );

      if (detalleActualizado) {
        // Verificar si el tipo cambió
        if (detalleExistente.tipo !== detalleActualizado.tipo) {
          // Revertir la operación anterior
          if (detalleExistente.tipo === 'incrementar') {
            // Revertir incremento: Restar la cantidad original
            movimientosPendientes.push(
              this.inventarioService.descontarStock({
                almacenId: almacen_id,
                cantidad: detalleExistente.cantidad,
                productoId: detalleExistente.producto_id,
                sku: detalleExistente.codigo_barras
              })
            );
          } else if (detalleExistente.tipo === 'decrementar') {
            // Revertir decremento: Sumar la cantidad original
            movimientosPendientes.push(
              this.inventarioService.agregarStock({
                almacenId: almacen_id,
                cantidad: detalleExistente.cantidad,
                productoId: detalleExistente.producto_id,
                sku: detalleExistente.codigo_barras
              })
            );
          }

          // Aplicar la nueva operación
          if (detalleActualizado.tipo === 'incrementar') {

            movimientosPendientes.push(
              this.inventarioService.agregarStock({
                almacenId: almacen_id,
                cantidad: detalleActualizado.cantidad + detalleExistente.cantidad,
                productoId: detalleActualizado.producto_id,
                sku: detalleActualizado.sku
              })
            );
            movimientosPendientes.push(
              this.movimientosService.registrarIngreso({
                almacenId: almacen_id,
                cantidad: detalleActualizado.cantidad + detalleExistente.cantidad,
                productoId: detalleActualizado.producto_id,
                descripcion: 'Editar ajuste',
                sku: detalleActualizado.sku
              })
            );
          } else if (detalleActualizado.tipo === 'decrementar') {
            movimientosPendientes.push(
              this.inventarioService.descontarStock({
                almacenId: almacen_id,
                cantidad: detalleActualizado.cantidad + detalleExistente.cantidad,
                productoId: detalleActualizado.producto_id,
                sku: detalleActualizado.sku
              })
            );
            movimientosPendientes.push(
              this.movimientosService.registrarSalida({
                almacenId: almacen_id,
                cantidad: detalleActualizado.cantidad + detalleExistente.cantidad,
                productoId: detalleActualizado.producto_id,
                descripcion: 'Editar ajuste',
                sku: detalleActualizado.sku
              })
            );
          }
        } else {
          // Si el tipo no cambió, verificar si la cantidad cambió
          const diferenciaCantidad = detalleExistente.cantidad - detalleActualizado.cantidad;
          console.log('cantidad diferencia' + diferenciaCantidad);


          if (diferenciaCantidad !== 0) {
            if (diferenciaCantidad > 0) {
              movimientosPendientes.push(
                this.inventarioService.agregarStock({
                  almacenId: almacen_id,
                  cantidad: diferenciaCantidad,
                  productoId: detalleActualizado.producto_id,
                  sku: detalleActualizado.sku
                })
              );
              movimientosPendientes.push(
                this.movimientosService.registrarIngreso({
                  almacenId: almacen_id,
                  cantidad: diferenciaCantidad,
                  productoId: detalleActualizado.producto_id,
                  descripcion: 'Ajuste Editado',
                  sku: detalleActualizado.sku
                })
              );
            } else {
              const cantidadARetirar = Math.abs(diferenciaCantidad);
              console.log(cantidadARetirar);

              movimientosPendientes.push(
                this.inventarioService.descontarStock({
                  almacenId: almacen_id,
                  cantidad: cantidadARetirar,
                  productoId: detalleActualizado.producto_id,
                  sku: detalleActualizado.sku
                })
              );
              movimientosPendientes.push(
                this.movimientosService.registrarSalida({
                  almacenId: almacen_id,
                  cantidad: cantidadARetirar,
                  productoId: detalleActualizado.producto_id,
                  descripcion: 'Ajuste Editado',
                  sku: detalleActualizado.sku
                })
              );
            }
          }
        }

        // **ACTUALIZA EL DETALLE EN LA BASE DE DATOS**
        detalleExistente.cantidad = detalleActualizado.cantidad;
        detalleExistente.unidad_medida = detalleActualizado.unidad_medida;
        detalleExistente.tipo = detalleActualizado.tipo;

        // Guarda el detalle actualizado
        await this.detalleAjusteRepository.save(detalleExistente);
      } else {
        // Eliminar detalles faltantes
        movimientosPendientes.push(
          this.inventarioService.descontarStock({
            almacenId: almacen_id,
            cantidad: detalleExistente.cantidad,
            productoId: detalleExistente.producto_id,
            sku: detalleExistente.codigo_barras
          })
        );
        await this.detalleAjusteRepository.delete(detalleExistente.id);
      }
    }

    // Agregar nuevos detalles
    const nuevosDetalles = detalles.filter(
      (detalle) => !existingAjuste.detalles.some((d) => d.producto_id === detalle.producto_id)
    );

    for (const nuevoDetalle of nuevosDetalles) {
      await this.detalleAjusteRepository.save(
        this.detalleAjusteRepository.create({
          ajuste_inventario: existingAjuste,
          producto_id: nuevoDetalle.producto_id,
          cantidad: nuevoDetalle.cantidad,
          unidad_medida: nuevoDetalle.unidad_medida,
          tipo: nuevoDetalle.tipo,
        })
      );
    }

    // Esperar todos los movimientos
    await Promise.all(movimientosPendientes);

    // Actualizar el ajuste principal
    existingAjuste.glosa = glosa;
    existingAjuste.fecha = fecha;
    existingAjuste.id_usuario = id_usuario;

    await this.ajusteInventarioRepository.save(existingAjuste);

    return this.ajusteInventarioRepository.findOne({
      where: { id },
      relations: ['detalles'],
    });
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
  async deleteAjuste(id: string): Promise<void> {
    // Verificar si el ajuste existe
    const existingAjuste = await this.ajusteInventarioRepository.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!existingAjuste) {
      throw new NotFoundException(`El ajuste con ID "${id}" no fue encontrado.`);
    }

    const movimientosPendientes = [];

    // Revertir el impacto de los detalles en el inventario
    for (const detalle of existingAjuste.detalles) {
      if (detalle.tipo === 'incrementar') {
        // Si se incrementó, restar del stock
        movimientosPendientes.push(
          this.inventarioService.descontarStock({
            almacenId: existingAjuste.almacen_id,
            cantidad: detalle.cantidad,
            productoId: detalle.producto_id,
            sku: detalle.codigo_barras,
          })
        );
        await this.movimientosService.registrarSalida({
          almacenId: existingAjuste.almacen_id,
          cantidad: detalle.cantidad,
          productoId: detalle.producto_id,
          descripcion: 'Ajuste Eliminado',
          sku: detalle.codigo_barras,
        });
      } else if (detalle.tipo === 'decrementar') {
        // Si se decrementó, sumar al stock
        movimientosPendientes.push(
          this.inventarioService.agregarStock({
            almacenId: existingAjuste.almacen_id,
            cantidad: detalle.cantidad,
            productoId: detalle.producto_id,
            sku: detalle.codigo_barras,
          })
        );

        await this.movimientosService.registrarIngreso({
          almacenId: existingAjuste.almacen_id,
          cantidad: detalle.cantidad,
          productoId: detalle.producto_id,
          descripcion: 'Ajuste eliminado.',
          sku: detalle.codigo_barras,
        });
      }
    }

    // Esperar a que todos los movimientos se procesen
    await Promise.all(movimientosPendientes);

    // Eliminar los detalles del ajuste
    await this.detalleAjusteRepository.delete({ ajuste_inventario: { id } });

    // Eliminar el ajuste principal
    await this.ajusteInventarioRepository.delete(id);
  }

  private async registrarMovimiento(almacen_id: string, detalle: CreateDetalleAjusteDto): Promise<void> {
    if (detalle.tipo === 'incrementar') {

      await this.inventarioService.agregarStock({
        almacenId: almacen_id,
        cantidad: detalle.cantidad,
        productoId: detalle.producto_id,
        sku:detalle.sku
      })

      await this.movimientosService.registrarIngreso({
        almacenId: almacen_id,
        cantidad: detalle.cantidad,
        productoId: detalle.producto_id,
        descripcion: 'Ajuste',
        sku:detalle.sku
      });
    } else {

      await this.inventarioService.descontarStock({
        almacenId: almacen_id,
        cantidad: detalle.cantidad,
        productoId: detalle.producto_id,
        sku:detalle.sku
      })
      await this.movimientosService.registrarSalida({
        almacenId: almacen_id,
        cantidad: detalle.cantidad,
        productoId: detalle.producto_id,
        descripcion: 'Ajuste',
        sku:detalle.sku
      });
    }
  }

}
