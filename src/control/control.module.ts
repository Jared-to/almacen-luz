import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Control } from './entities/control.entity';
import { ControlService } from './control.service';
import { ControlController } from './control.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Control])],
  controllers: [ControlController],
  providers: [ControlService],
  exports:[ControlService]
})
export class ControlModule {}
