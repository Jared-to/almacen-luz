import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Almacen } from './entities/almacen.entity';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';

@Injectable()
export class AlmacenesService {
  constructor(
    @InjectRepository(Almacen)
    private readonly almacenRepository: Repository<Almacen>,
  ) {}

  // Crear un nuevo almacén
  async create(createAlmacenDto: CreateAlmacenDto): Promise<Almacen> {
    const nuevoAlmacen = this.almacenRepository.create(createAlmacenDto);
    return this.almacenRepository.save(nuevoAlmacen);
  }

  // Obtener todos los almacenes
  async findAll(): Promise<Almacen[]> {
    return this.almacenRepository.find();
  }

  // Obtener un almacén por ID
  async findOne(id: string): Promise<Almacen> {
    const almacen = await this.almacenRepository.findOne({
      where: { id },
    });

    if (!almacen) {
      throw new NotFoundException(`Almacén con ID "${id}" no encontrado`);
    }
    return almacen;
  }

  // Actualizar un almacén
  async update(id: string, updateAlmacenDto: UpdateAlmacenDto): Promise<Almacen> {
    const almacen = await this.findOne(id); // Verificar si existe
    const actualizado = Object.assign(almacen, updateAlmacenDto);
    return this.almacenRepository.save(actualizado);
  }

  // Eliminar un almacén
  async remove(id: string): Promise<void> {
    const result = await this.almacenRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Almacén con ID "${id}" no encontrado`);
    }
  }
}
