import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('proveedores')
export class Proveedore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  increment: number;

  @Column({ type: 'text', unique: true,nullable:true })
  codigo: string;

  @Column('text')
  nombre: string;

  @Column('text')
  contacto_principal: string;

  @Column('text')
  telefono: string;

  @Column('text')
  direccion: string;

  @Column('text')
  ciudad: string;

}
