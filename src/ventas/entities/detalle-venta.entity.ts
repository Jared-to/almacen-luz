import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Venta } from "./venta.entity";
import { Inventario } from "src/inventario/entities/inventario.entity";

@Entity('detall_venta')
export class DetalleVenta {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Venta, (venta) => venta.detalles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @ManyToOne(() => Inventario, { eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventario_id' })
  inventario: Inventario;


  @Column('text', { nullable: true })
  nombreProducto: string;

  @Column('text', { nullable: true })
  marca: string;

  @Column('float')
  precio: number;

  @Column('int')
  cantidad: number;


  @Column('text')
  unidad_medida: string;


  @Column('float')
  subtotal: number;


}
