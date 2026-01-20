import { Inventario } from "src/inventario/entities/inventario.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Compra } from "./compra.entity";


@Entity('detalle-compra')
export class DetalleCompra {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inventario, { eager: false })
  @JoinColumn({ name: 'inventario_id' })
  inventario: Inventario;

  @Column('float')
  cantidad: number;

  @Column('float')
  precioCompra: number;

  @Column('float')
  precioVenta: number;

  @Column('float')
  precioMinVenta: number;

  @ManyToOne(() => Compra, compra => compra.detalles)
  @JoinColumn({ name: 'compra_id' }) // Relaciona con la columna 'id' de 'compra'
  compra: Compra;
}