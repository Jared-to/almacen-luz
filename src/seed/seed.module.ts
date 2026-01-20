import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AlmacenesModule } from 'src/almacenes/almacenes.module';
import { ControlModule } from 'src/control/control.module';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [AuthModule, AlmacenesModule, ControlModule]
})
export class SeedModule { }
