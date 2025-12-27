import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TraspasosService } from './despachos.service';
import { CreateTraspasoDto } from './dto/create-despacho.dto';
import { UpdateDespachoDto } from './dto/update-despacho.dto';

@Controller('traspasos')
export class TraspasosController {
  constructor(private readonly traspasosService: TraspasosService) {}

  @Post()
  create(@Body() createTraspasoDto: CreateTraspasoDto) {
    return this.traspasosService.create(createTraspasoDto);
  }

  @Get()
  findAll() {
    return this.traspasosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.traspasosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTraspasoDto: UpdateDespachoDto) {
    return this.traspasosService.update(id, updateTraspasoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.traspasosService.remove(id);
  }
}
