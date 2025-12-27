import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { createAlmacen, createUserSeed } from './data/data'
import { AlmacenesService } from 'src/almacenes/almacenes.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly authServie: AuthService,
    private readonly almacenServie: AlmacenesService,
  ) { }
  async create(): Promise<object> {

    const seed = await this.authServie.create(createUserSeed)
    const almacen = await this.almacenServie.create(createAlmacen)
    if (!seed || !almacen) {
      throw new InternalServerErrorException('Error al hacer el seed.')
    }
    return {
      message: 'Seed Excute'
    }
  }

}
