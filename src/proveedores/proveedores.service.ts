import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedore } from './entities/proveedore.entity';
import { CreateProveedoreDto } from './dto/create-proveedore.dto';
import { UpdateProveedoreDto } from './dto/update-proveedore.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedore)
    private readonly proveedorRepository: Repository<Proveedore>,
  ) { }

  // Crear un nuevo proveedor
  async create(createProveedorDto: CreateProveedoreDto): Promise<Proveedore> {
    const proveedor = this.proveedorRepository.create({
      ...createProveedorDto
    });

    const proveedorGuardado = await this.proveedorRepository.save(proveedor);
    // Validar si 'increment' existe, aunque debería ser garantizado por la base de datos
    if (!proveedorGuardado.increment) {
      proveedorGuardado.increment = 1; // En caso de que sea nulo por algún motivo
    }

    // Generar el código basado en el increment
    proveedorGuardado.codigo = `PVR${proveedorGuardado.increment.toString().padStart(4, '0')}`;

    // Guardar nuevamente el proveedor con el código generado
    return this.proveedorRepository.save(proveedorGuardado);
  }

  // Obtener todos los proveedores
  async findAll(): Promise<Proveedore[]> {
    return this.proveedorRepository.find();
  }

  // Obtener un proveedor por ID
  async findOne(id: string): Promise<Proveedore> {
    const proveedor = await this.proveedorRepository.findOne({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID "${id}" no encontrado.`);
    }
    return proveedor;
  }

  // Actualizar un proveedor
  async update(id: string, updateProveedorDto: UpdateProveedoreDto): Promise<Proveedore> {

    const proveedor = await this.proveedorRepository.preload({
      id, // Combina el ID existente con los nuevos datos
      ...updateProveedorDto,
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID "${id}" no encontrado.`);
    }

    return this.proveedorRepository.save(proveedor);
  }

  // Eliminar un proveedor
  async remove(id: string): Promise<void> {
    const proveedor = await this.findOne(id);

    await this.proveedorRepository.remove(proveedor);
  }

}
