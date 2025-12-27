import { Venta } from "src/ventas/entities/venta.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('clientes')
export class Cliente {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  increment: number;

  @Column({ type: 'text', unique: true, nullable: true })
  codigo: string;

  @Column('text')
  nombre: string;

  @Column('text', { nullable: true })
  apellido: string;

  @Column('text', { nullable: true })
  direccion: string;

  @Column('text', { nullable: true })
  cumpleanios: string;

  @Column('text', { nullable: true })
  telefono: string;


}
