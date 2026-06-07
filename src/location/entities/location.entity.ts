import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Tree,
  TreeChildren,
  TreeParent,
  ManyToOne,
} from 'typeorm';
import { LocationSchedule } from './location-schedule.entity';
import { Department } from '../../department/entities/department.entity';

@Entity()
@Tree('closure-table')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 0 })
  capacity: number;

  @Column({ default: false })
  isRoom: boolean;

  @Column({ default: false })
  isUsing: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => LocationSchedule, (schedule) => schedule.location, {
    cascade: true,
  })
  schedules: LocationSchedule[];

  @TreeChildren()
  children: Location[];

  @TreeParent()
  parent: Location | null;

  @ManyToOne(() => Department, (department) => department.locations)
  department: Department;
}
