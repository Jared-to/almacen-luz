import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('inventario-inicial')
export class inventarioInicial {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  almacen_id: string;


  @Column('uuid')
  producto_id: string;


  @Column('int')
  cantidad: number;

  @Column('text')
  codigo_barras: string;

  @CreateDateColumn()
  fecha: Date;


  @Column('float')
  precio_compra: number;


  @Column('float')
  precio_venta: number;
}
