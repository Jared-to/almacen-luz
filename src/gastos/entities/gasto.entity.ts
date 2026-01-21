import { Almacen } from "src/almacenes/entities/almacen.entity";
import { User } from "src/auth/entities/user.entity";
import { Caja } from "src/cajas/entities/caja.entity";
import { CategoriaGasto } from "src/categoria-gastos/entities/categoria-gasto.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('gastos')
export class Gasto {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  increment: number;

  @Column({ type: 'text', unique: true, nullable: true })
  codigo: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;


  @Column('enum', { enum: ['Variables', 'Fijos'], })
  tipo: string;

  @Column('text')
  glosa: string;

  @Column('text')
  detalle: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column('float')
  monto: number;

  @Column({ type: 'enum', enum: ['EFECTIVO', 'QR', 'TRANSFERENCIA'], default: 'EFECTIVO' })
  tipo_pago: string;

  // Relación muchos a uno
  @ManyToOne(() => CategoriaGasto, (categoria) => categoria.gastos, {
    nullable: true,          // Permite que el producto quede sin categoría
    onDelete: 'SET NULL',    // Si se elimina la categoría, se pone NULL
  })
  categoria: CategoriaGasto;

  // Relación muchos a uno
  @ManyToOne(() => Caja, (caja) => caja.gastos, {
    nullable: true,
    onDelete: 'CASCADE', // Elimina los gastos si se elimina la caja

  })
  caja: Caja;

  @ManyToOne(() => Almacen, { eager: false })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;
}
