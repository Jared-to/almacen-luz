import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DetalleVenta } from "./detalle-venta.entity";
import { Cliente } from "src/clientes/entities/cliente.entity";
import { User } from "src/auth/entities/user.entity";
import { Almacen } from "src/almacenes/entities/almacen.entity";
import { Caja } from "src/cajas/entities/caja.entity";

@Entity('ventas')
export class Venta {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  increment: number;

  @Column({ type: 'text', unique: true, nullable: true })
  codigo: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  fecha: Date;


  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  fechaEdit: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  fechaAnulada: Date;


  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  vendedor: User;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column('text', { nullable: true })
  usuarioAnulador: string;

  @Column('float')
  subtotal: number;

  @Column('float')
  total: number;

  @Column('float', { nullable: true })
  montoQR: number;

  @Column('float', { nullable: true })
  montoEfectivo: number;

  @Column('float', { nullable: true })
  montoRecibido: number;

  @Column('text', { nullable: true })
  nombreCliente: string;

  @Column('boolean', { default: true })
  estado: boolean;

  @Column('float')
  descuento: number

  @Column({ type: 'enum', enum: ['EFECTIVO', 'QR', 'TRANSFERENCIA', 'QR-EFECTIVO'], default: 'EFECTIVO' })
  tipo_pago: string;


  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta, {
    cascade: ['insert', 'update', 'remove'], // Especifica las operaciones en cascada
    onDelete: 'CASCADE', // Asegura la eliminación en cascada
    onUpdate: 'CASCADE', // Sincroniza las actualizaciones de claves primarias
  })
  detalles: DetalleVenta[];


  // Relación muchos a uno
  @ManyToOne(() => Caja, (caja) => caja.ventas, {
    nullable: true, // Hace obligatorio que cada venta tenga una caja
  })
  caja: Caja;
}
