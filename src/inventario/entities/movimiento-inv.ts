import { Almacen } from 'src/almacenes/entities/almacen.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';


@Entity('movimientos_inventario')
export class MovimientoInventario {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Almacen, { onDelete: 'SET NULL' }
  )
  almacen: Almacen;

  @ManyToOne(() => Producto, { onDelete: 'SET NULL' }
  )
  product: Producto;

  @Column('text')
  nombreProducto: string

  @Column('text')
  nombreAlmacen: string

  @Column('text')
  tipo: string;

  @Column('text')
  sku:string

  @Column('float')
  cantidad: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  fecha: Date;

  @Column('text', { nullable: true })
  descripcion: string;

}
