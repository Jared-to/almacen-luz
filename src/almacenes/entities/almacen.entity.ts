import { User } from "src/auth/entities/user.entity";
import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";


@Entity('almacenes')
export class Almacen {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  nombre: string;


  @Column('text', { nullable: true })
  ubicacion?: string;


  @Column('text', { nullable: true })
  encargado?: string;


  // Relación OneToMany: Un almacén puede tener varios usuarios
  @OneToMany(() => User, usuario => usuario.almacen)
  usuarios: User[];
}
