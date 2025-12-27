import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DetalleAjuste } from "./detalle-ajuste.entity";
import { Almacen } from "src/almacenes/entities/almacen.entity";
import { User } from "src/auth/entities/user.entity";

@Entity('ajuste-inventario')
export class AjusteInventario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  almacen_id: string;

  @ManyToOne(() => Almacen, { eager: false })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column('text', { nullable: true })
  fecha: string;

  @Column('text')
  glosa: string;

  @Column('uuid', { nullable: true })
  id_usuario: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({ type: 'int', generated: 'increment', unique: true })
  increment: number;

  @Column({ type: 'text', unique: true, nullable: true })
  codigo: string;


  @OneToMany(() => DetalleAjuste, detalle => detalle.ajuste_inventario)
  detalles: DetalleAjuste[];
}
