import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Control } from './entities/control.entity';
import { CreateControlDto } from './dto/create-control.dto';
import { UpdateControlDto } from './dto/update-control.dto';

@Injectable()
export class ControlService {
  constructor(
    @InjectRepository(Control)
    private readonly controlRepository: Repository<Control>,
  ) { }

  async create(createControlDto: CreateControlDto): Promise<Control> {
    const control = this.controlRepository.create(createControlDto);
    return await this.controlRepository.save(control);
  }

  async controlSistema(dto: CreateControlDto): Promise<Control> {
    const control = await this.controlRepository.find();

    
    let controlF = control[0]

    //  Invertir el estado
    controlF.estado = !controlF.estado;

    //  Actualizar título o descripción solo si se envían en el DTO
    if (dto.titleMensaje) {
      controlF.titleMensaje = dto.titleMensaje;
    }

    if (dto.descripcionMensaje) {
      controlF.descripcionMensaje = dto.descripcionMensaje;
    }

    //  Guardar cambios
    return await this.controlRepository.save(controlF);
  }

  async findOne(): Promise<Control> {
    const d = await this.controlRepository.find();
    return d[0]
  }


  async remove(id: string): Promise<void> {
    const result = await this.controlRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Control con id ${id} no encontrado`);
    }
  }
}
