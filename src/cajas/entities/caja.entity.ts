import { User } from "src/auth/entities/user.entity";
import { Gasto } from "src/gastos/entities/gasto.entity";
import { Venta } from "src/ventas/entities/venta.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('cajas')
export class Caja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  increment: number;

  @Column({ type: 'text', unique: true, nullable: true })
  codigo: string;


  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_apertura: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  fecha_cierre: any;

  @Column('float')
  saldo_apertura: number;

  @Column('float')
  ventas_QR: number;

  @Column('float')
  ventas_Efectivo: number;

  @Column('float')
  gastos_QR: number;

  @Column('float')
  gastos_efectivo: number;

  @Column('float')
  saldo_cierre_QR: number;

  @Column('float')
  saldo_cierre_efectivo: number;

  @Column('float')
  saldo_cierre_neto: number;

  @OneToMany(() => Venta, (venta) => venta.caja, { onDelete: 'CASCADE' })
  ventas: Venta[];

  @OneToMany(() => Gasto, (gasto) => gasto.caja, { onDelete: 'CASCADE' })
  gastos: Gasto[];
}
