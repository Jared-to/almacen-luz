import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HomeService } from './home.service';


@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  findAll() {
    return this.homeService.infoHomeInicio();
  }

}
