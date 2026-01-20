import { Almacen } from 'src/almacenes/entities/almacen.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';


@Entity('historial_precio')
export class HistorialPrecio {

  @PrimaryGeneratedColumn('uuid')
  id: string;


  @ManyToOne(() => Producto, { onDelete: 'SET NULL' }
  )
  product: Producto;

  @Column('float')
  precioVentaAnt: number

  @Column('float')
  precioVentaNuevo: number

}
