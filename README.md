# Campus Parking Management System

A real-time campus parking management system for IIT (ISM) Dhanbad that lets students, staff, security, and administrators coordinate parking. Users can see live slot availability, reserve a slot with a QR-based permit, and track their history. Security scans QR codes at the gate, and administrators manage zones and view analytics.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Quick Start](#quick-start)
4. [Demo Accounts](#demo-accounts)
5. [Project Structure](#project-structure)
6. [Configuration](#configuration)
7. [API Overview](#api-overview)
8. [Screenshots](#screenshots)
9. [Troubleshooting](#troubleshooting)
10. [License](#license)

---

## Features

### For Users (Students / Staff)
- Sign up and sign in with JWT authentication
- Browse all parking zones and see live slot status
- Reserve a slot for a custom time window (with server-side overlap prevention)
- Get a QR-based parking permit at reservation time
- View a complete reservation history (sortable)
- Receive in-app notifications (welcome, reservation confirmation, expiry warnings)
- Edit profile (name, email, vehicle plate) and change password

### For Security Staff
- Unified dashboard showing all zones and slots at a glance
- Scan QR codes from user permits to verify validity
- Manually update slot status (Available / Occupied / Maintenance)
- Check out a reservation (frees the slot and marks the reservation complete)
- View all active reservations (sortable)

### For Administrators
- Create, edit, soft-delete parking zones (with configurable `zoneCode`)
- Auto-generate slots for new zones using zone code as prefix (e.g. `A1`, `A2`...)
- Dashboard with live KPIs: total slots, available, in use, occupancy rate, active reservations, total users
- Zone usage overview charts
- Date-range reports with quick-range buttons (Today / Last 7 days / 30 days / 90 days / All time)
- User management (change roles, delete users)
- Audit log viewer: who did what, when
- Force-cancel any active reservation

### Platform Features
- Role-based access control (`ROLE_USER`, `ROLE_SECURITY`, `ROLE_ADMIN`)
- File-based H2 database so data persists across restarts
- Automated scheduled tasks: expire past reservations, activate future-to-current reservations, send pre-expiry notifications
- Audit logging for critical actions
- Modern, responsive SPA UI (vanilla JS + custom components)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Java 17 |
| Build | Maven |
| Backend | Spring Boot 3.2.5 |
| Security | Spring Security + JWT (JJWT) |
| Persistence | Spring Data JPA + Hibernate 6 |
| Database | H2 (file-based, embedded) |
| Scheduling | Spring `@Scheduled` |
| Testing | JUnit 5, Mockito |
| Frontend | Vanilla JavaScript (SPA), HTML5, CSS3 |
| QR | `qrcodejs` (generation), `jsQR` (scanning) |
| Charts | Chart.js |

---

## Quick Start

### Prerequisites
- Java 17 or later
- Maven 3.6+
- A modern browser (Chrome, Edge, Firefox)

### Run the app
```bash
mvn spring-boot:run
```

Then open: **http://localhost:8080**

The first run auto-seeds demo data (users, 3 zones, 30 slots, sample reservations). On subsequent runs the data persists inside `./data/campus_parking.mv.db`.

### Run tests
```bash
mvn test
```

### Build a JAR
```bash
mvn clean package
java -jar target/parking-1.0.0.jar
```

---

## Demo Accounts

| Role | Username | Password |
|---|---|---|
| User | `user1` | `password123` |
| User | `user2` | `password123` |
| Security | `security1` | `password123` |
| Admin | `admin1` | `password123` |

---

## Project Structure

```
campus-parking/
├── pom.xml
├── data/                           # H2 database files (auto-created)
├── src/
│   ├── main/
│   │   ├── java/parking/
│   │   │   ├── CampusParkingApplication.java
│   │   │   ├── config/             # Security, JWT, CORS, data seeding
│   │   │   ├── controller/         # REST endpoints
│   │   │   ├── service/            # Business logic
│   │   │   ├── repository/         # Spring Data JPA repositories
│   │   │   ├── model/              # JPA entities
│   │   │   └── dto/                # Data transfer objects
│   │   └── resources/
│   │       ├── application.properties
│   │       └── static/             # SPA frontend
│   │           ├── index.html
│   │           ├── css/styles.css
│   │           ├── js/             # api.js, auth.js, app.js, dashboards
│   │           └── images/logo.png
│   └── test/
│       └── java/parking/service/   # Unit tests (JUnit + Mockito)
├── DOCUMENTATION.md                # In-depth technical docs
└── README.md                       # This file
```

---

## Configuration

All settings live in `src/main/resources/application.properties`. Key knobs:

```properties
# Server
server.port=8080

# Database (file-based H2 persists across restarts)
spring.datasource.url=jdbc:h2:file:./data/campus_parking
spring.jpa.hibernate.ddl-auto=update

# JWT (override via environment variables in production!)
jwt.secret=${JWT_SECRET:...default dev secret...}
jwt.expiration=${JWT_EXPIRATION:86400000}
```

### Production overrides
```bash
export JWT_SECRET="$(openssl rand -base64 64)"
export JWT_EXPIRATION=3600000
mvn spring-boot:run
```

---

## API Overview

Base URL: `http://localhost:8080/api`

All endpoints except `/auth/login` and `/auth/register` require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Role |
|---|---|---|
| POST | `/auth/login` | public |
| POST | `/auth/register` | public |
| GET | `/auth/me` | any authenticated |
| PUT | `/auth/me` | any authenticated |
| PUT | `/auth/me/password` | any authenticated |

### Parking
| Method | Endpoint | Role |
|---|---|---|
| GET | `/parking/zones` | any authenticated |
| GET | `/parking/zones/{id}/slots` | any authenticated |
| GET | `/parking/zones-with-slots` | any authenticated |
| GET | `/parking/stats` | any authenticated |

### Reservations (User)
| Method | Endpoint | Role |
|---|---|---|
| POST | `/reservations` | USER |
| GET | `/reservations/my` | USER |
| DELETE | `/reservations/{id}` | USER (owner) |
| POST | `/reservations/{id}/cancel` | USER (owner) |

### Security
| Method | Endpoint | Role |
|---|---|---|
| GET | `/security/reservations` | SECURITY |
| POST | `/security/verify` | SECURITY |
| PUT | `/security/slots/{id}/status` | SECURITY |
| POST | `/security/reservations/{id}/checkout` | SECURITY |

### Admin
| Method | Endpoint | Role |
|---|---|---|
| POST | `/admin/zones` | ADMIN |
| PUT | `/admin/zones/{id}` | ADMIN |
| DELETE | `/admin/zones/{id}` | ADMIN |
| POST | `/admin/zones/{id}/slots` | ADMIN |
| GET | `/admin/stats` | ADMIN |
| GET | `/admin/reports` | ADMIN |
| GET | `/admin/users` | ADMIN |
| GET | `/admin/audit` | ADMIN |

See `DOCUMENTATION.md` for full request/response payloads.

---

## Screenshots

- Login page with role-based demo accounts
- User dashboard: zone cards with live availability
- Reservation flow with QR permit generation
- Security dashboard: live slot grid + QR scanner
- Admin dashboard: KPIs, charts, reports, audit log

---

## Troubleshooting

**"Database may be already in use"**
Another Java process already has the H2 file open. Stop it:
```powershell
Get-Process java | Stop-Process -Force
```

**"Invalid username or password" on demo accounts**
The database file from an earlier run might have stale data. Delete it and restart:
```powershell
Remove-Item data\*.db
mvn spring-boot:run
```

**Logo not showing or wrong image**
Do a hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac).

**Port 8080 already in use**
Change `server.port` in `application.properties` or kill the other service.

---

## License

Academic project for IIT (ISM) Dhanbad. All rights reserved to the authors.
