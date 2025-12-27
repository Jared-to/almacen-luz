import { Gasto } from "src/gastos/entities/gasto.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";


@Entity('categorias_gastos')
export class CategoriaGasto {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  nombre: string;

  @Column('text')
  descripcion: string;

  @OneToMany(() => Gasto, (gasto) => gasto.categoria)
  gastos: Gasto[];
}
