import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Cliente } from './entities/cliente.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) { }
  // Crear un nuevo cliente
  async create(createClienteDto: CreateClienteDto): Promise<Cliente> {

    const CE = await this.clienteRepository.findOne({ where: { nombre: createClienteDto.nombre } });

    if (CE) {
      return CE;
    }

    // Crear el cliente sin asignar aún el código
    const nuevoCliente = this.clienteRepository.create(createClienteDto);

    // Guardar primero para generar el valor de 'increment'
    const clienteGuardado = await this.clienteRepository.save(nuevoCliente);

    // Validar si 'increment' existe, aunque debería ser garantizado por la base de datos
    if (!clienteGuardado.increment) {
      clienteGuardado.increment = 1; // En caso de que sea nulo por algún motivo
    }

    // Generar el código basado en el increment
    clienteGuardado.codigo = `CL${clienteGuardado.increment.toString().padStart(4, '0')}`;

    // Guardar nuevamente el cliente con el código generado
    return this.clienteRepository.save(clienteGuardado);
  }


  // Obtener todos los clientes
  async findAll(): Promise<Cliente[]> {
    return this.clienteRepository.find();
  }

  // Obtener un cliente por ID
  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({ where: { id } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return cliente;
  }
  //buscar por codigo
  async findOneCodigo(codigo: string) {
    const client = await this.clienteRepository.findOne({ where: { codigo: codigo } });
    if (!client) {
      throw new HttpException({
        status: HttpStatus.NOT_FOUND,
        error: 'Nose encontro al cliente',
      }, HttpStatus.NOT_FOUND);
    }
    return client;
  }

  // Actualizar un cliente
  async update(id: string, updateClienteDto: Partial<UpdateClienteDto>): Promise<Cliente> {
    const cliente = await this.clienteRepository.preload({
      id,
      ...updateClienteDto,
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return this.clienteRepository.save(cliente);
  }

  // Eliminar un cliente
  async remove(id: string): Promise<void> {
    const cliente = await this.findOne(id);
    await this.clienteRepository.remove(cliente);
  }
  async getUpcomingBirthdays(): Promise<Cliente[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer la hora de hoy a medianoche

    // Recuperar todos los clientes
    const clientes = await this.clienteRepository.find();

    const clientesConFechas = clientes
      .map(cliente => {
        const cumpleaniosDate = new Date(cliente.cumpleanios);

        // Crear una nueva fecha ajustada al año actual
        let cumpleaniosEsteAno = new Date(
          today.getFullYear(),
          cumpleaniosDate.getMonth(),
          cumpleaniosDate.getDate() + 1
        );

        // Si el cumpleaños ya pasó este año y no es hoy, ajustarlo al próximo año
        if (cumpleaniosEsteAno < today) {
          cumpleaniosEsteAno.setFullYear(today.getFullYear() + 1);
        }

        // Calcular los días hasta el cumpleaños (ignorar horas)
        const daysUntilBirthday = Math.ceil(
          (cumpleaniosEsteAno.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...cliente,
          daysUntilBirthday,
        };
      })
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday) // Ordenar por los días restantes
      .slice(0, 5); // Obtener los 5 más cercanos

    return clientesConFechas;
  }



  async getClientesCount(): Promise<number> {
    return this.clienteRepository.count();
  }
}
