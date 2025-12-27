import { Inventario } from "src/inventario/entities/inventario.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Traspaso } from "./despacho.entity";


@Entity('detalle-traspasos')
export class DetalleTraspaso {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inventario, { eager: false })
  @JoinColumn({ name: 'inventario_id' })
  inventario: Inventario;

  @Column('float')
  cantidad: number;

  @ManyToOne(() => Traspaso, traspaso => traspaso.detalles)
  @JoinColumn({ name: 'traspaso_id' }) // Relaciona con la columna 'id' de 'traspasos'
  traspaso: Traspaso;
}