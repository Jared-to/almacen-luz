import { Module } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';
import { Categoria } from './entities/categoria.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [CategoriasController],
  providers: [CategoriasService],
  imports: [
    TypeOrmModule.forFeature([Categoria]),
    AuthModule
  ],
  exports: [TypeOrmModule], 
})
export class CategoriasModule {}
