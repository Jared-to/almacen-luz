import { Module } from '@nestjs/common';
import { CategoriaGastosController } from './categoria-gastos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CategoriasGastosService } from './categoria-gastos.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoriaGasto]),
    AuthModule
  ],
  controllers: [CategoriaGastosController],
  providers: [CategoriasGastosService],
  exports: [TypeOrmModule]
})
export class CategoriaGastosModule { }
