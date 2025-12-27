import { PartialType } from '@nestjs/mapped-types';
import { CreateTraspasoDto } from './create-despacho.dto';

export class UpdateDespachoDto extends PartialType(CreateTraspasoDto) {}
