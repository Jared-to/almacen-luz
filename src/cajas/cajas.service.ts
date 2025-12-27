import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import * as moment from 'moment-timezone';

import { Caja } from './entities/caja.entity';
import { Gasto } from 'src/gastos/entities/gasto.entity';
import { Venta } from 'src/ventas/entities/venta.entity';
import { CajaApertura } from './interface/cajaApertura.interface';
import { VentasService } from 'src/ventas/ventas.service';

@Injectable()
export class CajasService {
  constructor(
    @InjectRepository(Caja)
    private readonly cajaRepository: Repository<Caja>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    private readonly ventasService: VentasService,
    private readonly dataSource: DataSource,
  ) { }


  // Crear una nueva caja con fecha_apertura y saldo_apertura

  async abrirCaja(cajaApertura: CajaApertura): Promise<Caja> {
    const { usuarioId, saldoApertura } = cajaApertura;

    const nuevaCaja = this.cajaRepository.create({
      usuario: { id: usuarioId },
      fecha_apertura: moment().tz("America/La_Paz").format("YYYY-MM-DD HH:mm:ss"),
      fecha_cierre: null,
      saldo_apertura: saldoApertura,
      ventas_QR: 0,
      ventas_Efectivo: 0,
      gastos_QR: 0,
      gastos_efectivo: 0,
      saldo_cierre_QR: 0,
      saldo_cierre_efectivo: 0,
      saldo_cierre_neto: 0
    });

    const cajaGuardada = await this.cajaRepository.save(nuevaCaja);

    // Validar si 'increment' existe, aunque debería ser garantizado por la base de datos
    if (!cajaGuardada.increment) {
      cajaGuardada.increment = 1; // En caso de que sea nulo por algún motivo
    }

    // Generar el código basado en el increment
    cajaGuardada.codigo = `CA${cajaGuardada.increment.toString().padStart(4, '0')}`;

    // Guardar nuevamente el caja con el código generado
    return this.cajaRepository.save(cajaGuardada);
  }
  async reabrirCaja(cajaId: string): Promise<Caja> {

    // Buscar la caja por su ID
    const caja = await this.cajaRepository.findOne({ where: { id: cajaId } });

    if (!caja) {
      throw new Error('La caja no existe.');
    }

    // Validar que la caja esté cerrada antes de reabrirla
    if (caja.fecha_cierre === null) {
      throw new Error('La caja ya está abierta.');
    }

    // Guardar los cambios en la base de datos
    return caja;
  }


  //Verificar si la última caja está cerrada
  async verificarEstadoUltimaCaja(id_usuario: string): Promise<object> {
    const ultimaCaja = await this.cajaRepository.findOne({
      where: { usuario: { id: id_usuario } }, // Asegura que no haya condiciones implícitas
      order: { fecha_apertura: 'DESC' },
    });



    if (!ultimaCaja) {
      throw new NotFoundException('No se encontró ninguna caja registrada.');
    }

    if (ultimaCaja.fecha_cierre) {
      return { message: 'Caja cerrada.' };
    }

    return {
      id_caja: ultimaCaja.id,
      message: 'Fecha de apertura',
      fecha: ultimaCaja.fecha_apertura
    };
  }


  // Cerrar caja: sumar totales de ventas y gastos, actualizar saldos y fecha_cierre
  async cerrarCaja(cajaId: string): Promise<Caja> {
    const caja = await this.cajaRepository.findOne({
      where: { id: cajaId },
      relations: ['ventas', 'gastos'],
    });

    if (!caja) {
      throw new NotFoundException(`Caja con ID ${cajaId} no encontrada.`);
    }

    if (caja.fecha_cierre) {
      throw new Error('Esta caja ya está cerrada.');
    }

    // Obtener todas las ventas y gastos relacionados a la caja
    const ventas = await this.ventaRepository.find({ where: { caja: { id: cajaId } } });
    const gastos = await this.gastoRepository.find({ where: { caja: { id: cajaId } } });

    // Calcular los totales según tipo de pago
    let totalVentasQR = ventas.filter(v => v.tipo_pago === 'QR').reduce((sum, venta) => sum + venta.total, 0);
    let totalVentasEfectivo = ventas.filter(v => v.tipo_pago === 'EFECTIVO').reduce((sum, venta) => sum + venta.total, 0);

    const totalGastosQR = gastos.filter(g => g.tipo_pago === 'QR').reduce((sum, gasto) => sum + gasto.monto, 0);
    const totalGastosEfectivo = gastos.filter(g => g.tipo_pago === 'EFECTIVO').reduce((sum, gasto) => sum + gasto.monto, 0);


    for (const element of ventas) {
      if (element.tipo_pago === 'QR-EFECTIVO') {
        totalVentasEfectivo += element.montoEfectivo;
        totalVentasQR += element.montoQR;
      }
    }

    // Actualizar los valores de la caja
    caja.fecha_cierre = moment().tz("America/La_Paz").format("YYYY-MM-DD HH:mm:ss");
    caja.ventas_QR = totalVentasQR;
    caja.ventas_Efectivo = totalVentasEfectivo;
    caja.gastos_QR = totalGastosQR;
    caja.gastos_efectivo = totalGastosEfectivo;

    caja.saldo_cierre_QR = totalVentasQR - totalGastosQR;
    caja.saldo_cierre_efectivo = totalVentasEfectivo - totalGastosEfectivo;

    caja.saldo_cierre_neto = (totalVentasQR - totalGastosQR) + (totalVentasEfectivo - totalGastosEfectivo) + caja.saldo_apertura;

    return await this.cajaRepository.save(caja);
  }
  async cerrarCajaEdit(cajaId: string): Promise<Caja> {
    const caja = await this.cajaRepository.findOne({
      where: { id: cajaId },
      relations: ['ventas', 'gastos'],
    });

    if (!caja) {
      throw new NotFoundException(`Caja con ID ${cajaId} no encontrada.`);
    }

    // Obtener todas las ventas y gastos relacionados a la caja
    const ventas = await this.ventaRepository.find({ where: { caja: { id: cajaId } } });
    const gastos = await this.gastoRepository.find({ where: { caja: { id: cajaId } } });

    // Calcular los totales según tipo de pago (solo estado true)
    let totalVentasQR = ventas
      .filter(v => v.estado === true && v.tipo_pago === 'QR')
      .reduce((sum, venta) => sum + venta.total, 0);

    let totalVentasEfectivo = ventas
      .filter(v => v.estado === true && v.tipo_pago === 'EFECTIVO')
      .reduce((sum, venta) => sum + venta.total, 0);

    const totalGastosQR = gastos
      .filter(g => g.tipo_pago === 'QR')
      .reduce((sum, gasto) => sum + gasto.monto, 0);

    const totalGastosEfectivo = gastos
      .filter(g => g.tipo_pago === 'EFECTIVO')
      .reduce((sum, gasto) => sum + gasto.monto, 0);

    // Sumar las ventas mixtas (QR-EFECTIVO) solo si estado es true
    for (const element of ventas) {
      if (element.estado === true && element.tipo_pago === 'QR-EFECTIVO') {
        totalVentasEfectivo += element.montoEfectivo;
        totalVentasQR += element.montoQR;
      }
    }


    // Actualizar los valores de la caja
    caja.fecha_cierre = new Date();
    caja.ventas_QR = totalVentasQR;
    caja.ventas_Efectivo = totalVentasEfectivo;
    caja.gastos_QR = totalGastosQR;
    caja.gastos_efectivo = totalGastosEfectivo;

    caja.saldo_cierre_QR = totalVentasQR - totalGastosQR;
    caja.saldo_cierre_efectivo = totalVentasEfectivo - totalGastosEfectivo;

    caja.saldo_cierre_neto = (totalVentasQR - totalGastosQR) + (totalVentasEfectivo - totalGastosEfectivo) + caja.saldo_apertura;

    return await this.cajaRepository.save(caja);
  }
  async findAll(): Promise<Caja[]> {
    return await this.cajaRepository.find({
      relations: ['usuario'],
      order: {
        fecha_apertura: 'DESC', // Ordena por fecha_apertura de más reciente a más antiguo
      },
    });
  }


  async findOne(id: string): Promise<Caja> {
    const caja = await this.cajaRepository.findOne({
      where: { id },
      relations: ['usuario', 'ventas', 'gastos', 'gastos.usuario', 'gastos.categoria', 'ventas.vendedor',],
    });

    if (!caja) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado.`);
    }

    return caja;
  }

  /**
 * Eliminar una caja por su ID
 */
  async remove(cajaId: string): Promise<string> {
    const caja = await this.cajaRepository.findOne({
      where: { id: cajaId },
      relations: ['ventas'],
    });

    if (!caja) {
      throw new NotFoundException(`Caja con ID ${cajaId} no encontrada.`);
    }

    // Iniciar una transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Procesar ventas asociadas
      for (const venta of caja.ventas) {
        // Usamos el servicio ventasService para realizar la lógica de devolución
        await this.ventasService.remove(venta.id);
      }

      // Eliminar la caja
      await queryRunner.manager.remove(Caja, caja);

      // Confirmar la transacción
      await queryRunner.commitTransaction();
      return `Caja con ID ${cajaId} eliminada exitosamente.`;
    } catch (error) {
      // Revertir cambios en caso de error
      await queryRunner.rollbackTransaction();
      throw new Error(`Error eliminando la caja y sus ventas: ${error.message}`);
    } finally {
      // Liberar recursos del query runner
      await queryRunner.release();
    }
  }


}
