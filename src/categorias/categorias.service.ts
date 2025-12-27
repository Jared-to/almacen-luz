import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Categoria } from './entities/categoria.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) { }

  // Crear una categoría
  async createCategoria(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    const categoria = this.categoriaRepository.create(createCategoriaDto);
    return await this.categoriaRepository.save(categoria);
  }

  // Editar una categoría
  async updateCategoria(id: string, updateCategoriaDto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.categoriaRepository.preload({
      id,
      ...updateCategoriaDto,
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return await this.categoriaRepository.save(categoria);
  }

  // Traer todas las categorías
  async findAllCategorias(): Promise<Categoria[]> {
    return await this.categoriaRepository.find({ relations: ['productos'] }); // Incluye los productos
  }

  // Traer una categoría específica
  async findOneCategoria(id: string): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOne({
      where: { id },
      relations: ['productos'], // Incluye los productos relacionados
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return categoria;
  }

  //eliminar categoria
  async remove(id: string): Promise<void> {
    const categoria = await this.findOneCategoria(id);
    await this.categoriaRepository.remove(categoria);
  }
}