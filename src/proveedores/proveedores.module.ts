import { Module } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';
import { Proveedore } from './entities/proveedore.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
  imports: [
    TypeOrmModule.forFeature([Proveedore]),
    AuthModule
  ],
})
export class ProveedoresModule {}
