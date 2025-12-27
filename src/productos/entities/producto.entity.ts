import { Categoria } from "src/categorias/entities/categoria.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('productos')
export class Producto {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  increment: number;

  @Column({ type: 'text', unique: true, nullable: true })
  codigo: string;

  @Column('text', { nullable: true })
  nombre: string;


  @Column('text', { nullable: true })
  marca: string;

  @Column('text', { nullable: true })
  unidad_medida: string;

  @Column('float', { nullable: true })
  precio_venta: number;


  @Column('text', { nullable: true })
  imagen: string;



  @Column('boolean', { default: true })
  estado: boolean;

  // Relación muchos a uno
  @ManyToOne(() => Categoria, (categoria) => categoria.productos, {
    nullable: false, // Hace obligatorio que cada producto tenga una categoría
    onDelete: 'CASCADE', // Elimina los productos si se elimina la categoría
  })
  categoria: Categoria;
}
