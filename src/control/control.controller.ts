import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ControlService } from './control.service';
import { CreateControlDto } from './dto/create-control.dto';
import { BasicAuthGuard } from './guards/basic-auth.guard';

@Controller('control')
export class ControlController {
  constructor(private readonly controlService: ControlService) { }

  @Post()
  create(@Body() createControlDto: CreateControlDto) {
    return this.controlService.create(createControlDto);
  }

  @Get()
  findAll() {
    return this.controlService.findOne();
  }


  @Patch('cambiar/estado')
  @UseGuards(BasicAuthGuard)
  updateControlSistema(
    @Body() dto: CreateControlDto,
  ) {
    
    return this.controlService.controlSistema(dto);
  }


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.controlService.remove(id);
  }
}
