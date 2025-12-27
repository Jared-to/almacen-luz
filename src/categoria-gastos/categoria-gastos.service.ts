import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CreateCategoriaGastoDto } from './dto/create-categoria-gasto.dto';
import { UpdateCategoriaGastoDto } from './dto/update-categoria-gasto.dto';

@Injectable()
export class CategoriasGastosService {
  constructor(
    @InjectRepository(CategoriaGasto)
    private readonly categoriaGastoRepository: Repository<CategoriaGasto>,
  ) {}

  async create(createCategoriaGastoDto: CreateCategoriaGastoDto): Promise<CategoriaGasto> {
    const nuevaCategoria = this.categoriaGastoRepository.create(createCategoriaGastoDto);
    return await this.categoriaGastoRepository.save(nuevaCategoria);
  }

  async findAll(): Promise<CategoriaGasto[]> {
    return await this.categoriaGastoRepository.find({ relations: ['gastos'] });
  }

  async findOne(id: string): Promise<CategoriaGasto> {
    const categoria = await this.categoriaGastoRepository.findOne({
      where: { id },
      relations: ['gastos'],
    });

    if (!categoria) {
      throw new NotFoundException(`CategoriaGasto con ID ${id} no encontrada.`);
    }
    return categoria;
  }

  async update(id: string, updateCategoriaGastoDto: UpdateCategoriaGastoDto): Promise<CategoriaGasto> {
    const categoria = await this.findOne(id);

    Object.assign(categoria, updateCategoriaGastoDto);
    return await this.categoriaGastoRepository.save(categoria);
  }

  async remove(id: string): Promise<void> {
    const categoria = await this.findOne(id);

    await this.categoriaGastoRepository.remove(categoria);
  }
}
