import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('control')
export class Control {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  titleMensaje: string;

  @Column('text')
  descripcionMensaje: string;

  @Column('boolean', { default: true })
  estado: boolean;



}
