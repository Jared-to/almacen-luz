import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AjusteInventario } from "./ajustes-inventario.entity";
import { Producto } from "src/productos/entities/producto.entity";

@Entity('detalle_ajuste')
export class DetalleAjuste {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AjusteInventario, ajuste => ajuste.detalles)
  @JoinColumn({ name: 'ajuste_inventario_id' })
  ajuste_inventario: AjusteInventario;

  @Column('uuid')
  producto_id: string;

  @ManyToOne(() => Producto, { eager: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column('float')
  cantidad: number;

  @Column('text')
  codigo_barras: string;

  @Column('text')
  unidad_medida: string;

  @Column('text')
  tipo: string;

  // Campo transitorio para el stock
  stock?: number;
}

