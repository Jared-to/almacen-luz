import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Raw, Repository } from 'typeorm';
import { Gasto } from './entities/gasto.entity';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { User } from 'src/auth/entities/user.entity';
import { CategoriaGasto } from 'src/categoria-gastos/entities/categoria-gasto.entity';
import * as moment from 'moment-timezone';
import { CajasService } from 'src/cajas/cajas.service';
import { AlmacenesService } from 'src/almacenes/almacenes.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';

@Injectable()
export class GastosService {
  constructor(
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CategoriaGasto)
    private readonly categoriaRepository: Repository<CategoriaGasto>,
    private readonly cajasService: CajasService,
    private readonly almacenService: AlmacenesService,
    private readonly notificationsService: NotificacionesService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(createGastoDto: CreateGastoDto): Promise<Gasto> {
    const { usuarioId, categoriaId, fecha, cajaId, almacen, ...rest } = createGastoDto;

    const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    const categoria = await this.categoriaRepository.findOne({ where: { id: categoriaId } });
    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada.`);
    }

    const caja = await this.cajasService.findOne(cajaId);

    if (!caja) {
      throw new Error(' Caja  no encontrados.');
    }

    const almacenD = await this.almacenService.findOne(almacen);


    const gasto = this.gastoRepository.create({
      ...rest,
      caja,
      usuario,
      categoria,
      almacen: { id: almacenD.id },
      fecha: moment(fecha).tz("America/La_Paz").toDate(),
    });

    const gastoGuardado = await this.gastoRepository.save(gasto);

    // Validar si 'increment' existe, aunque debería ser garantizado por la base de datos
    if (!gastoGuardado.increment) {
      gastoGuardado.increment = 1; // En caso de que sea nulo por algún motivo
    }

    // Generar el código basado en el increment
    gastoGuardado.codigo = `G${gastoGuardado.increment.toString().padStart(4, '0')}`;

    // Guardar nuevamente el gasto con el código generado

    const gastosG = await this.gastoRepository.save(gastoGuardado);
    this.notificationsService.sendEvent({
      type: 'gastoCreado',
      payload: {
        rol: 'admin',
        tipo: 'gasto',
        mensaje: `Nuevo Gasto - ${gastosG?.codigo} - ${gastosG.glosa}`,
        fecha: gastosG.fecha,
      },
    });

    // --- ENVÍO DEL MENSAJE ---
    const mensaje = `🛒 *Comercio.bo*  
✨ ¡Se realizó un *nuevo Gasto*! ✨

👤 Glosa: *${gasto.glosa || 'Desconocido'}*  
💰 Monto: *${gasto.monto.toFixed(2)} Bs*  
💰 Metodo de Pago: *${gasto.tipo_pago}*  
🆔 Código: *${gasto.codigo}*  
📅 Fecha: *${new Date(gasto.fecha).toLocaleString()}*

✅ Revisa los detalles en tu panel de ventas.`;


    // Emitir evento asíncrono SIN bloquear la respuesta
    this.eventEmitter.emitAsync('gasto.creada', {
      numero: process.env.WSP_NUM,
      mensaje,
    });
    return gastosG;

  }

  async findAll(): Promise<Gasto[]> {
    return await this.gastoRepository.find({
      relations: ['usuario', 'categoria'],
    });
  }

  async findAllDates(fechaInicio: string | 'xx', fechaFin: string | 'xx', user: User): Promise<Gasto[]> {

    const isAdmin = user?.roles?.some(role => role === 'admin') ?? false;

    if (fechaInicio === 'xx' && fechaFin === 'xx') {
      return this.gastoRepository.find({
        where: user.roles[0] === 'admin' ? {} : { usuario: { id: user.id } },
        relations: ['usuario', 'categoria', 'caja','almacen'],
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
    return this.gastoRepository.find({
      where: whereConditions,
      relations: ['usuario', 'categoria','caja','almacen'],
    });
  }

  async findOne(id: string): Promise<Gasto> {
    const gasto = await this.gastoRepository.findOne({
      where: { id },
      relations: ['usuario', 'categoria', 'caja'],
    });

    if (!gasto) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado.`);
    }

    return gasto;
  }

  async update(id: string, updateGastoDto: UpdateGastoDto): Promise<Gasto> {
    const gasto = await this.findOne(id);

    const { usuarioId, categoriaId, ...rest } = updateGastoDto;

    if (usuarioId) {
      const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
      if (!usuario) {
        throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
      }
      gasto.usuario = usuario;
    }

    if (categoriaId) {
      const categoria = await this.categoriaRepository.findOne({ where: { id: categoriaId } });
      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${categoriaId} no encontrada.`);
      }
      gasto.categoria = categoria;
    }

    Object.assign(gasto, rest);

    return await this.gastoRepository.save(gasto);
  }

  async remove(id: string): Promise<void> {
    const gasto = await this.findOne(id);
    await this.gastoRepository.remove(gasto);
  }
  async getGastosCount(): Promise<number> {
    return this.gastoRepository.count();
  }
}
function formatDateToYMD(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0'); // meses inician en 0
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}