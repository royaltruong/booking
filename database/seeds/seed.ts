import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Department } from '../../src/department/entities/department.entity';
import { Location } from '../../src/location/entities/location.entity';
import { LocationSchedule } from '../../src/location/entities/location-schedule.entity';
import { User } from '../../src/user/entities/user.entity';
import { Booking } from '../../src/booking/entities/booking.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'booking',
  entities: [Department, Location, LocationSchedule, User, Booking],
  synchronize: false,
});

async function clearData() {
  await dataSource.query(`DELETE FROM booking`);
  await dataSource.query(`DELETE FROM location_schedule`);
  await dataSource.query(`DELETE FROM "user"`);
  await dataSource.query(`DELETE FROM location_closure`);
  await dataSource.query(`DELETE FROM location`);
  await dataSource.query(`DELETE FROM department`);

  await dataSource.query(`ALTER SEQUENCE booking_id_seq RESTART WITH 1`);
  await dataSource.query(`ALTER SEQUENCE location_schedule_id_seq RESTART WITH 1`);
  await dataSource.query(`ALTER SEQUENCE user_id_seq RESTART WITH 1`);
  await dataSource.query(`ALTER SEQUENCE location_id_seq RESTART WITH 1`);
  await dataSource.query(`ALTER SEQUENCE department_id_seq RESTART WITH 1`);
}

async function seedDepartments(repo: ReturnType<typeof dataSource.getRepository<Department>>) {
  const departments = repo.create([
    { name: 'Information Technology' },
    { name: 'Human Resources' },
    { name: 'Engineering' },
    { name: 'Marketing' },
    { name: 'Operations' },
  ]);
  return repo.save(departments);
}

async function seedLocations(
  repo: ReturnType<typeof dataSource.getTreeRepository<Location>>,
  departments: Department[],
) {
  const [deptIT, deptHR, deptEng, deptMkt, deptOps] = departments;

  // Building A
  const buildingA = await repo.save(
    repo.create({ name: 'Building A', capacity: 0, isRoom: false, isActive: true, department: deptIT }),
  );

  const floorA1 = await repo.save(
    repo.create({ name: 'Floor 1 - Building A', capacity: 0, isRoom: false, isActive: true, parent: buildingA, department: deptIT }),
  );

  const room101 = await repo.save(
    repo.create({ name: 'Room 101', capacity: 10, isRoom: true, isUsing: false, isActive: true, parent: floorA1, department: deptIT }),
  );
  const room102 = await repo.save(
    repo.create({ name: 'Room 102', capacity: 8, isRoom: true, isUsing: false, isActive: true, parent: floorA1, department: deptHR }),
  );
  // isUsing = true: has an active booking today
  const confRoomA = await repo.save(
    repo.create({ name: 'Conference Room A', capacity: 20, isRoom: true, isUsing: true, isActive: true, parent: floorA1, department: deptIT }),
  );

  const floorA2 = await repo.save(
    repo.create({ name: 'Floor 2 - Building A', capacity: 0, isRoom: false, isActive: true, parent: buildingA, department: deptEng }),
  );

  const room201 = await repo.save(
    repo.create({ name: 'Room 201', capacity: 12, isRoom: true, isUsing: false, isActive: true, parent: floorA2, department: deptEng }),
  );
  const confRoomB = await repo.save(
    repo.create({ name: 'Conference Room B', capacity: 30, isRoom: true, isUsing: false, isActive: true, parent: floorA2, department: deptMkt }),
  );

  // Building B
  const buildingB = await repo.save(
    repo.create({ name: 'Building B', capacity: 0, isRoom: false, isActive: true, department: deptOps }),
  );

  const floorB1 = await repo.save(
    repo.create({ name: 'Floor 1 - Building B', capacity: 0, isRoom: false, isActive: true, parent: buildingB, department: deptOps }),
  );

  const roomLab = await repo.save(
    repo.create({ name: 'Lab Room', capacity: 15, isRoom: true, isUsing: false, isActive: true, parent: floorB1, department: deptEng }),
  );
  // isActive = false: room is decommissioned
  const roomStorage = await repo.save(
    repo.create({ name: 'Storage Room', capacity: 5, isRoom: true, isUsing: false, isActive: false, parent: floorB1, department: deptOps }),
  );

  return { room101, room102, confRoomA, room201, confRoomB, roomLab, roomStorage };
}

async function seedSchedules(
  repo: ReturnType<typeof dataSource.getRepository<LocationSchedule>>,
  rooms: Record<string, Location>,
) {
  const activeRooms = [rooms.room101, rooms.room102, rooms.confRoomA, rooms.room201, rooms.confRoomB, rooms.roomLab];
  const weekdays = [1, 2, 3, 4, 5]; // Monday - Friday

  const schedules: LocationSchedule[] = [];
  for (const room of activeRooms) {
    for (const day of weekdays) {
      const s = repo.create({ dayOfWeek: day, openTime: '08:00:00', closeTime: '17:00:00', location: room });
      schedules.push(s);
    }
  }
  await repo.save(schedules);
}

async function seedUsers(
  repo: ReturnType<typeof dataSource.getRepository<User>>,
  departments: Department[],
) {
  const [deptIT, deptHR, deptEng, deptMkt, deptOps] = departments;

  const users = [
    repo.create({ username: 'admin', fullname: 'System Administrator', password: 'Admin@123', department: deptIT, isActive: true }),
    repo.create({ username: 'john.smith', fullname: 'John Smith', password: 'Password@123', department: deptIT, isActive: true }),
    repo.create({ username: 'emily.clark', fullname: 'Emily Clark', password: 'Password@123', department: deptHR, isActive: true }),
    repo.create({ username: 'michael.lee', fullname: 'Michael Lee', password: 'Password@123', department: deptEng, isActive: true }),
    repo.create({ username: 'sarah.jones', fullname: 'Sarah Jones', password: 'Password@123', department: deptMkt, isActive: true }),
    repo.create({ username: 'david.nguyen', fullname: 'David Nguyen', password: 'Password@123', department: deptOps, isActive: true }),
    // Deactivated account
    repo.create({ username: 'user.inactive', fullname: 'Deactivated User', password: 'Password@123', department: deptIT, isActive: false }),
  ];

  // save one by one so @BeforeInsert password hashing fires correctly
  const saved: User[] = [];
  for (const u of users) {
    saved.push(await repo.save(u));
  }
  return saved;
}

async function seedBookings(
  repo: ReturnType<typeof dataSource.getRepository<Booking>>,
  users: User[],
  rooms: Record<string, Location>,
) {
  const [adminUser, userA, userB, userC, userD, userE] = users;

  const bookings = [
    // Case 1: ACTIVE - bookingTime in the past, returnTime in the future, isFinish=false, location.isUsing=true
    repo.create({
      name: 'IT Team Meeting Q2/2026',
      capacity: 15,
      bookingTime: new Date('2026-06-07T08:00:00+07:00'),
      returnTime: new Date('2026-06-07T17:00:00+07:00'),
      isFinish: false,
      user: userA,
      location: rooms.confRoomA,
    }),

    // Case 2: UPCOMING - bookingTime and returnTime both in the future
    repo.create({
      name: 'Engineering Sprint 6 Planning',
      capacity: 8,
      bookingTime: new Date('2026-06-10T09:00:00+07:00'),
      returnTime: new Date('2026-06-10T11:00:00+07:00'),
      isFinish: false,
      user: userC,
      location: rooms.room101,
    }),

    // Case 3: UPCOMING - admin books room for a training session
    repo.create({
      name: 'June Internal Training',
      capacity: 10,
      bookingTime: new Date('2026-06-11T13:00:00+07:00'),
      returnTime: new Date('2026-06-11T15:00:00+07:00'),
      isFinish: false,
      user: adminUser,
      location: rooms.room201,
    }),

    // Case 4: COMPLETED - isFinish=true, time in the past
    repo.create({
      name: 'HR Candidate Interview',
      capacity: 4,
      bookingTime: new Date('2026-06-01T09:00:00+07:00'),
      returnTime: new Date('2026-06-01T11:00:00+07:00'),
      isFinish: true,
      user: userB,
      location: rooms.room102,
    }),

    // Case 5: COMPLETED - marketing strategy meeting
    repo.create({
      name: 'Q3 Marketing Strategy Meeting',
      capacity: 25,
      bookingTime: new Date('2026-06-03T14:00:00+07:00'),
      returnTime: new Date('2026-06-03T16:30:00+07:00'),
      isFinish: true,
      user: userD,
      location: rooms.confRoomB,
    }),

    // Case 6: OVERDUE - returnTime has passed but isFinish=false (not yet returned)
    repo.create({
      name: 'Operations Equipment Inspection',
      capacity: 10,
      bookingTime: new Date('2026-06-05T10:00:00+07:00'),
      returnTime: new Date('2026-06-05T12:00:00+07:00'),
      isFinish: false,
      user: userE,
      location: rooms.roomLab,
    }),

    // Case 7: MULTIPLE BOOKINGS SAME USER - userA has a second booking
    repo.create({
      name: 'Sprint 5 Code Review',
      capacity: 6,
      bookingTime: new Date('2026-06-12T09:00:00+07:00'),
      returnTime: new Date('2026-06-12T11:00:00+07:00'),
      isFinish: false,
      user: userA,
      location: rooms.room102,
    }),

    // Case 8: COMPLETED - userC lab experiment session
    repo.create({
      name: 'Embedded Software Testing',
      capacity: 12,
      bookingTime: new Date('2026-06-02T08:00:00+07:00'),
      returnTime: new Date('2026-06-02T12:00:00+07:00'),
      isFinish: true,
      user: userC,
      location: rooms.roomLab,
    }),

    // Case 9: UPCOMING NEXT WEEK - same room as case 2 on a different date
    repo.create({
      name: 'June Monthly All-Hands',
      capacity: 20,
      bookingTime: new Date('2026-06-15T10:00:00+07:00'),
      returnTime: new Date('2026-06-15T12:00:00+07:00'),
      isFinish: false,
      user: adminUser,
      location: rooms.confRoomB,
    }),

    // Case 10: OVERDUE - booking from last month, never closed
    repo.create({
      name: 'IT Internal Workshop',
      capacity: 18,
      bookingTime: new Date('2026-05-28T13:00:00+07:00'),
      returnTime: new Date('2026-05-28T17:00:00+07:00'),
      isFinish: false,
      user: userA,
      location: rooms.confRoomA,
    }),
  ];

  await repo.save(bookings);
}

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  await clearData();
  console.log('Cleared existing data');

  const departmentRepo = dataSource.getRepository(Department);
  const locationRepo = dataSource.getTreeRepository(Location);
  const scheduleRepo = dataSource.getRepository(LocationSchedule);
  const userRepo = dataSource.getRepository(User);
  const bookingRepo = dataSource.getRepository(Booking);

  const departments = await seedDepartments(departmentRepo);
  console.log(`Created ${departments.length} departments`);

  const rooms = await seedLocations(locationRepo, departments);
  console.log('Created location tree (building -> floor -> room)');

  await seedSchedules(scheduleRepo, rooms);
  console.log('Created room schedules (Mon-Fri, 08:00-17:00)');

  const users = await seedUsers(userRepo, departments);
  console.log(`Created ${users.length} users (passwords hashed)`);

  await seedBookings(bookingRepo, users, rooms);
  console.log('Created demo bookings');

  await dataSource.destroy();

  console.log('\n✔ Seed completed! Demo data summary:');
  console.log('  Departments : 5 (IT, HR, Engineering, Marketing, Operations)');
  console.log('  Locations   : 2 buildings -> 3 floors -> 8 rooms (1 decommissioned)');
  console.log('  Users       : 7 (1 admin, 5 staff, 1 deactivated)');
  console.log('  Bookings    : 10 (1 active, 3 upcoming, 3 completed, 2 overdue, 1 next week)');
  console.log('\n  Credentials:');
  console.log('    admin          / Admin@123');
  console.log('    john.smith     / Password@123');
  console.log('    emily.clark    / Password@123');
  console.log('    michael.lee    / Password@123');
  console.log('    sarah.jones    / Password@123');
  console.log('    david.nguyen   / Password@123');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
