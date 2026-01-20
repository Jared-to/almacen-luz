import { Almacen } from "src/almacenes/entities/almacen.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "src/auth/entities/user.entity";
import { DetalleCompra } from "./detalle-compra.entity";

@Entity('compras')
export class Compra {

  @PrimaryGeneratedColumn('uuid')
  id: string;


  @ManyToOne(() => Almacen, { eager: false })
  @JoinColumn({ name: 'almacen' })
  almacen: Almacen;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  responsable: User;

  @Column('text')
  glosa: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  fecha: Date;

  @OneToMany(() => DetalleCompra, (detalle) => detalle.compra, {
  })
  detalles: DetalleCompra[];
}
