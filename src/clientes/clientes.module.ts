import { Module } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from './entities/cliente.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente]),
    AuthModule
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports:[ClientesService]
})
export class ClientesModule { }
