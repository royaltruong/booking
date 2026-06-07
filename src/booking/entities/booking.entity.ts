import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Location } from '../../location/entities/location.entity';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  capacity: number;

  @Column({ type: 'timestamptz' })
  bookingTime: Date;

  @Column({ type: 'timestamptz' })
  returnTime: Date;

  @Column({ default: false })
  isFinish: boolean;

  @ManyToOne(() => User, (user) => user.bookings)
  user: User;

  @ManyToOne(() => Location)
  location: Location;
}
