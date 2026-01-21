import { Categoria } from "src/categorias/entities/categoria.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

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

  @Column('text', { nullable: true })
  imagen: string;

  @Column('boolean', { default: true })
  estado: boolean;

  @Column('float', { nullable: true })
  precioVenta: number;

  @Column('float', { nullable: true })
  precioVentaMin: number;

  @Column('float', { nullable: true })
  precioCompraIn: number;
  // Relación muchos a uno
  @ManyToOne(() => Categoria, (categoria) => categoria.productos, {
    nullable: true,          // Permite que el producto quede sin categoría
    onDelete: 'SET NULL',    // Si se elimina la categoría, se pone NULL
  })
  categoria: Categoria | null;

  @Column('boolean', { default: false })
  is_delete: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createDate: Date;
}
