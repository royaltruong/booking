# Location Manager & Booking Manager REST API

A RESTful API built with NestJS and PostgreSQL for managing locations, departments, users and room bookings.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 (Fastify adapter) |
| Language | TypeScript 5.7 |
| Database | PostgreSQL |
| ORM | TypeORM 1.0 |
| Authentication | JWT (passport-jwt) + bcrypt |
| Validation | class-validator / class-transformer |
| Documentation | Swagger (@nestjs/swagger 11) |
| Package Manager | pnpm |
| Container | Docker (Node 22 Alpine, multi-stage build) |

---

## Database Schema

### Entity Relationship

```
Department ──< User
Department ──< Location ──< LocationSchedule
                Location ──< Location (self-referencing tree)
User       ──< Booking >── Location
```

### Tables

#### `department`
| Column | Type | Constraints |
|---|---|---|
| id | integer | PK, auto-increment |
| name | varchar | Unique, not null |

#### `user`
| Column | Type | Constraints |
|---|---|---|
| id | integer | PK, auto-increment |
| username | varchar | Unique, not null |
| fullname | varchar | Not null |
| password | varchar | Bcrypt hashed, not null |
| isActive | boolean | Default: true |
| department_id | integer | FK → department.id, nullable |
| createdAt | timestamptz | Auto |
| updatedAt | timestamptz | Auto |

#### `location`
| Column | Type | Constraints |
|---|---|---|
| id | integer | PK, auto-increment |
| name | varchar | Not null |
| capacity | integer | Default: 0 |
| isRoom | boolean | Default: false |
| isUsing | boolean | Default: false |
| isActive | boolean | Default: true |
| parent_id | integer | FK → location.id, nullable (tree) |
| department_id | integer | FK → department.id, nullable |

#### `location_schedule`
| Column | Type | Constraints |
|---|---|---|
| id | integer | PK, auto-increment |
| dayOfWeek | integer | 0 = Sunday … 6 = Saturday |
| openTime | time | Format HH:mm |
| closeTime | time | Format HH:mm, must be after openTime |
| location_id | integer | FK → location.id, cascade delete |

#### `booking`
| Column | Type | Constraints |
|---|---|---|
| id | integer | PK, auto-increment |
| name | varchar | Not null |
| capacity | integer | Not null |
| bookingTime | timestamptz | Future datetime |
| returnTime | timestamptz | Same day, after bookingTime |
| isFinish | boolean | Default: false |
| user_id | integer | FK → user.id |
| location_id | integer | FK → location.id |

---

## API Reference

All protected endpoints require the header:
```
Authorization: Bearer <token>
```

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new account |
| POST | `/auth/login` | — | Login and receive JWT token |
| GET | `/auth/profile` | Required | Get current user profile |

### User

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/user` | Required | List users (paginated) |
| PATCH | `/user/:id/join` | Required | Join a department |
| DELETE | `/user/:id` | Required | Delete a user |

### Department

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/department` | Required | Create a department |
| GET | `/department` | Required | List departments (paginated) |
| PATCH | `/department/:id` | Required | Update department name |
| DELETE | `/department/:id` | Required | Delete a department |

### Location

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/location` | Required | Create a location |
| GET | `/location` | Required | List locations (paginated) |
| GET | `/location/:id` | Required | Get location detail |
| GET | `/location/:id/ancestors` | Required | Get all ancestors of a location (flat list) |
| GET | `/location/:id/descendants` | Required | Get all descendants of a location (flat list) |
| PUT | `/location/:id` | Required | Update a location |
| DELETE | `/location/:id` | Required | Delete a location |

### Booking

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/booking` | Required | Create a booking |
| GET | `/booking` | Required | List own bookings |
| PUT | `/booking/:id` | Required | Update a booking |
| DELETE | `/booking/:id` | Required | Delete a booking |
| POST | `/booking/:id/checkin` | Required | Check in — marks the room as in use |
| POST | `/booking/:id/checkout` | Required | Check out — frees the room and sets return time to now |

---

## Running with Docker

### Prerequisites
- Docker and Docker Compose installed.

### 1. Create `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 123456
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: 123456
      DB_NAME: postgres
      DB_SYNC: "true"
      JWT_SECRET: abcsdxyz@!
    depends_on:
      - db

volumes:
  pgdata:
```

### 2. Build and start

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

### 3. Stop

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

---

## Seed Demo Data

### Run the seed script

Make sure the database is running, then execute:

**1. Run migrations to create tables:**

```bash
pnpm migration:run
```

**2. Seed demo data:**

```bash
pnpm seed
```

> The script **clears all existing data** and reloads the demo dataset from scratch.

---

### Seeded records

#### Departments — 5 records

| id | name |
|---|---|
| 1 | Information Technology |
| 2 | Human Resources |
| 3 | Engineering |
| 4 | Marketing |
| 5 | Operations |

#### Users — 7 records

| id | username | fullname | password | department | isActive |
|---|---|---|---|---|---|
| 1 | admin | System Administrator | `Admin@123` | Information Technology | true |
| 2 | john.smith | John Smith | `Password@123` | Information Technology | true |
| 3 | emily.clark | Emily Clark | `Password@123` | Human Resources | true |
| 4 | michael.lee | Michael Lee | `Password@123` | Engineering | true |
| 5 | sarah.jones | Sarah Jones | `Password@123` | Marketing | true |
| 6 | david.nguyen | David Nguyen | `Password@123` | Operations | true |
| 7 | user.inactive | Deactivated User | `Password@123` | Information Technology | **false** |

#### Locations — 12 records (3-level tree)

| id | name | parent | capacity | isRoom | isUsing | isActive | department |
|---|---|---|---|---|---|---|---|
| 1 | Building A | — | 0 | false | — | true | IT |
| 2 | Floor 1 - Building A | Building A | 0 | false | — | true | IT |
| 3 | Room 101 | Floor 1 - Building A | 10 | true | false | true | IT |
| 4 | Room 102 | Floor 1 - Building A | 8 | true | false | true | HR |
| 5 | Conference Room A | Floor 1 - Building A | 20 | true | **true** | true | IT |
| 6 | Floor 2 - Building A | Building A | 0 | false | — | true | Engineering |
| 7 | Room 201 | Floor 2 - Building A | 12 | true | false | true | Engineering |
| 8 | Conference Room B | Floor 2 - Building A | 30 | true | false | true | Marketing |
| 9 | Building B | — | 0 | false | — | true | Operations |
| 10 | Floor 1 - Building B | Building B | 0 | false | — | true | Operations |
| 11 | Lab Room | Floor 1 - Building B | 15 | true | false | true | Engineering |
| 12 | Storage Room | Floor 1 - Building B | 5 | true | false | **false** | Operations |

#### Location Schedules — 30 records

Each active room (Room 101, Room 102, Conference Room A, Room 201, Conference Room B, Lab Room) has a schedule for **Monday – Friday, 08:00 – 17:00**.

#### Bookings — 10 records

| id | name | user | location | bookingTime | returnTime | isFinish | Status |
|---|---|---|---|---|---|---|---|
| 1 | IT Team Meeting Q2/2026 | john.smith | Conference Room A | 2026-06-07 08:00 | 2026-06-07 17:00 | false | **Active** |
| 2 | Engineering Sprint 6 Planning | michael.lee | Room 101 | 2026-06-10 09:00 | 2026-06-10 11:00 | false | Upcoming |
| 3 | June Internal Training | admin | Room 201 | 2026-06-11 13:00 | 2026-06-11 15:00 | false | Upcoming |
| 4 | HR Candidate Interview | emily.clark | Room 102 | 2026-06-01 09:00 | 2026-06-01 11:00 | true | Completed |
| 5 | Q3 Marketing Strategy Meeting | sarah.jones | Conference Room B | 2026-06-03 14:00 | 2026-06-03 16:30 | true | Completed |
| 6 | Operations Equipment Inspection | david.nguyen | Lab Room | 2026-06-05 10:00 | 2026-06-05 12:00 | false | **Overdue** |
| 7 | Sprint 5 Code Review | john.smith | Room 102 | 2026-06-12 09:00 | 2026-06-12 11:00 | false | Upcoming |
| 8 | Embedded Software Testing | michael.lee | Lab Room | 2026-06-02 08:00 | 2026-06-02 12:00 | true | Completed |
| 9 | June Monthly All-Hands | admin | Conference Room B | 2026-06-15 10:00 | 2026-06-15 12:00 | false | Upcoming |
| 10 | IT Internal Workshop | john.smith | Conference Room A | 2026-05-28 13:00 | 2026-05-28 17:00 | false | **Overdue** |

---

## Swagger UI

Interactive API documentation is served at:

```
http://localhost:3000/api
```

### Authenticate in Swagger

1. Call `POST /auth/login` with your credentials — copy the `token` from the response.
2. Click the **Authorize** button (lock icon) at the top right.
3. Paste the token into the **Bearer** field and click **Authorize**.
4. All subsequent requests in the UI will include the JWT header automatically.
