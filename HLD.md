# High-Level Design (HLD) — Campus Parking Management System

> **Project:** Campus Parking Management System
> **Version:** 1.0.0
> **Stack:** Spring Boot 3.2.5 · Java 17 · H2 · JWT · Vanilla JS SPA

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Module Decomposition](#4-module-decomposition)
5. [Data Model](#5-data-model)
6. [API Design](#6-api-design)
7. [Security Architecture](#7-security-architecture)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Key Flows](#9-key-flows)
10. [Deployment View](#10-deployment-view)
11. [Non-Functional Characteristics](#11-non-functional-characteristics)

---

## 1. Introduction

### 1.1 Purpose

The Campus Parking Management System digitizes and streamlines parking operations on a university campus. It enables students and faculty to reserve parking slots online, security staff to verify occupancy via QR codes, and administrators to manage zones, monitor usage analytics, and review audit trails.

### 1.2 Scope

- Online parking slot reservation with QR-code-based check-in/checkout
- Three user roles: **User**, **Security Staff**, **Admin**
- Real-time zone and slot availability tracking
- Automated reservation expiry with scheduled notifications
- Admin dashboard with usage statistics, reports, and audit logging

---

## 2. Architecture Overview

The system follows a **monolithic layered MVC architecture** where the Spring Boot backend serves both the REST API and the static frontend SPA from a single deployable JAR.

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        SPA["Vanilla JS SPA<br/>index.html + JS Modules"]
    end

    subgraph Server["Spring Boot 3.2.5 (Java 17)"]
        direction TB
        Controllers["Controllers<br/>(REST API Layer)"]
        Services["Services<br/>(Business Logic)"]
        Repositories["Repositories<br/>(Spring Data JPA)"]
        Security["JWT Auth Filter<br/>(Spring Security)"]
        Scheduler["@Scheduled<br/>(Expiry & Notifications)"]
    end

    subgraph DB["Database"]
        H2["H2 File-backed DB<br/>./data/campus_parking"]
    end

    SPA -->|"HTTP REST (JSON)<br/>Authorization: Bearer JWT"| Security
    Security --> Controllers
    Controllers --> Services
    Services --> Repositories
    Scheduler --> Services
    Repositories -->|JDBC| H2
```

---

## 3. Technology Stack

```mermaid
block-beta
    columns 3
    block:frontend["Frontend"]:3
        A["HTML5 / CSS3"]
        B["Vanilla JavaScript (ES6+)"]
        C["qrcodejs (CDN) / jsQR"]
    end
    block:backend["Backend"]:3
        D["Java 17"]
        E["Spring Boot 3.2.5"]
        F["Spring Security + JWT"]
    end
    block:data["Data & Build"]:3
        G["H2 Embedded DB"]
        H["Hibernate / JPA"]
        I["Maven"]
    end
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Language | Java 17 | Backend application logic |
| Framework | Spring Boot 3.2.5 | Web, Data JPA, Security, Validation |
| ORM | Hibernate (Spring Data JPA) | Object-relational mapping |
| Database | H2 (file-backed, AUTO_SERVER) | Persistent embedded storage |
| Auth | JJWT 0.12.5 + BCrypt | Token-based stateless authentication |
| Frontend | Vanilla JS SPA | Single-page application with DOM manipulation |
| QR | qrcodejs + jsQR | QR code generation and camera-based scanning |
| Build | Maven | Dependency management and packaging |
| Testing | JUnit 5 / Spring Boot Test | Unit testing |

---

## 4. Module Decomposition

```mermaid
graph LR
    subgraph config["Config Layer"]
        SC[SecurityConfig]
        JU[JwtUtil]
        JF[JwtAuthFilter]
        WC[WebConfig]
        DS[DataSeeder]
    end

    subgraph controller["Controller Layer"]
        AC[AuthController]
        PC[ParkingController]
        RC[ReservationController]
        SSC[SecurityStaffController]
        ADC[AdminController]
        NC[NotificationController]
    end

    subgraph service["Service Layer"]
        AS[AuthService]
        PS[ParkingService]
        RS[ReservationService]
        NS[NotificationService]
        RPS[ReportService]
        ALS[AuditLogService]
    end

    subgraph repository["Repository Layer"]
        UR[UserRepository]
        PZR[ParkingZoneRepository]
        PSR[ParkingSlotRepository]
        RR[ReservationRepository]
        NR[NotificationRepository]
        ALR[AuditLogRepository]
    end

    AC --> AS
    PC --> PS
    RC --> RS
    SSC --> RS
    ADC --> PS
    ADC --> RPS
    ADC --> ALS
    NC --> NS

    AS --> UR
    PS --> PZR
    PS --> PSR
    RS --> RR
    RS --> PSR
    NS --> NR
    RPS --> RR
    ALS --> ALR
```

### Module Responsibilities

| Module | Controller | Service(s) | Responsibility |
|--------|-----------|------------|----------------|
| **Auth** | `AuthController` | `AuthService` | Registration, login, JWT issuance, profile & password management |
| **Parking** | `ParkingController` | `ParkingService` | Zone and slot browsing, availability queries |
| **Reservation** | `ReservationController` | `ReservationService` | Create/cancel/delete reservations, overlap detection, QR generation, auto-expiry |
| **Security Staff** | `SecurityStaffController` | `ReservationService` | QR verification, check-in/checkout, slot status updates |
| **Admin** | `AdminController` | `ParkingService`, `ReportService`, `AuditLogService` | Dashboard stats, zone CRUD, slot provisioning, reports, user listing, audit log |
| **Notification** | `NotificationController` | `NotificationService` | In-app notifications, unread counts, mark-as-read |
| **Audit** | — | `AuditLogService` | Cross-cutting action logging consumed by other services |

---

## 5. Data Model

### 5.1 Entity-Relationship Diagram

```mermaid
erDiagram
    USER {
        Long id PK
        String username UK
        String email UK
        String password
        String fullName
        String vehiclePlate
        Role role
        LocalDateTime createdAt
    }

    PARKING_ZONE {
        Long id PK
        String name
        String location
        String zoneCode
        int totalSlots
        Status status
    }

    PARKING_SLOT {
        Long id PK
        Long zone_id FK
        String slotNumber
        SlotStatus status
    }

    RESERVATION {
        Long id PK
        Long user_id FK
        Long slot_id FK
        LocalDateTime startTime
        LocalDateTime endTime
        ReservationStatus status
        String qrCode UK
    }

    NOTIFICATION {
        Long id PK
        Long user_id FK
        String message
        boolean isRead
        LocalDateTime createdAt
    }

    AUDIT_LOG {
        Long id PK
        String username
        String action
        String details
        LocalDateTime createdAt
    }

    USER ||--o{ RESERVATION : "makes"
    USER ||--o{ NOTIFICATION : "receives"
    PARKING_ZONE ||--o{ PARKING_SLOT : "contains"
    PARKING_SLOT ||--o{ RESERVATION : "reserved via"
```

### 5.2 Enumerations

```mermaid
graph LR
    subgraph UserRole["User.Role"]
        R1[ROLE_USER]
        R2[ROLE_SECURITY]
        R3[ROLE_ADMIN]
    end

    subgraph ZoneStatus["ParkingZone.Status"]
        Z1[ACTIVE]
        Z2[INACTIVE]
    end

    subgraph SlotStatus["ParkingSlot.Status"]
        S1[AVAILABLE]
        S2[OCCUPIED]
        S3[RESERVED]
        S4[MAINTENANCE]
    end

    subgraph ResStatus["Reservation.Status"]
        RS1[ACTIVE]
        RS2[COMPLETED]
        RS3[CANCELLED]
        RS4[EXPIRED]
    end
```

---

## 6. API Design

### 6.1 Endpoint Map

```mermaid
graph LR
    subgraph Public
        A1["POST /api/auth/login"]
        A2["POST /api/auth/register"]
    end

    subgraph Authenticated["Authenticated (Any Role)"]
        A3["GET /api/auth/me"]
        A4["PUT /api/auth/me"]
        A5["PUT /api/auth/me/password"]
        P1["GET /api/parking/zones"]
        P2["GET /api/parking/zones-with-slots"]
        P3["GET /api/parking/zones/:id/slots"]
        N1["GET /api/notifications"]
        N2["GET /api/notifications/unread-count"]
        N3["PUT /api/notifications/:id/read"]
        N4["PUT /api/notifications/read-all"]
    end

    subgraph UserOnly["ROLE_USER"]
        R1["POST /api/reservations"]
        R2["GET /api/reservations/my"]
        R3["DELETE /api/reservations/:id"]
        R4["DELETE /api/reservations/:id/delete"]
    end

    subgraph SecurityRole["ROLE_SECURITY / ROLE_ADMIN"]
        S1["GET /api/security/reservations/active"]
        S2["GET /api/security/verify/:qrCode"]
        S3["POST /api/security/reservations/:id/checkout"]
        S4["PUT /api/security/slots/:id/status"]
    end

    subgraph AdminOnly["ROLE_ADMIN"]
        AD1["GET /api/admin/stats"]
        AD2["GET /api/admin/usage"]
        AD3["POST /api/admin/zones"]
        AD4["PUT /api/admin/zones/:id"]
        AD5["DELETE /api/admin/zones/:id"]
        AD6["POST /api/admin/zones/:zoneId/slots"]
        AD7["GET /api/admin/reports"]
        AD8["GET /api/admin/users"]
        AD9["GET /api/admin/audit"]
    end
```

### 6.2 Endpoint Reference Table

| Method | Endpoint | Auth | Role | Description |
|--------|---------|------|------|-------------|
| POST | `/api/auth/login` | Public | — | Authenticate and receive JWT |
| POST | `/api/auth/register` | Public | — | Create new user account |
| GET | `/api/auth/me` | Yes | Any | Get current user profile |
| PUT | `/api/auth/me` | Yes | Any | Update profile details |
| PUT | `/api/auth/me/password` | Yes | Any | Change password |
| GET | `/api/parking/zones` | Yes | Any | List all active zones |
| GET | `/api/parking/zones-with-slots` | Yes | Any | Zones with slot details |
| GET | `/api/parking/zones/:id/slots` | Yes | Any | Slots for a specific zone |
| POST | `/api/reservations` | Yes | User | Create a reservation |
| GET | `/api/reservations/my` | Yes | User | List own reservations |
| DELETE | `/api/reservations/:id` | Yes | User | Cancel a reservation |
| DELETE | `/api/reservations/:id/delete` | Yes | User | Delete reservation record |
| GET | `/api/notifications` | Yes | Any | List user notifications |
| GET | `/api/notifications/unread-count` | Yes | Any | Count of unread notifications |
| PUT | `/api/notifications/:id/read` | Yes | Any | Mark notification as read |
| PUT | `/api/notifications/read-all` | Yes | Any | Mark all as read |
| GET | `/api/security/reservations/active` | Yes | Security/Admin | All active reservations |
| GET | `/api/security/verify/:qrCode` | Yes | Security/Admin | Verify QR code |
| POST | `/api/security/reservations/:id/checkout` | Yes | Security/Admin | Complete reservation checkout |
| PUT | `/api/security/slots/:id/status` | Yes | Security/Admin | Update slot status |
| GET | `/api/admin/stats` | Yes | Admin | Dashboard statistics |
| GET | `/api/admin/usage` | Yes | Admin | Zone usage analytics |
| POST | `/api/admin/zones` | Yes | Admin | Create a new zone |
| PUT | `/api/admin/zones/:id` | Yes | Admin | Update zone details |
| DELETE | `/api/admin/zones/:id` | Yes | Admin | Delete a zone |
| POST | `/api/admin/zones/:zoneId/slots` | Yes | Admin | Add slots to a zone |
| GET | `/api/admin/reports` | Yes | Admin | Date-range usage reports |
| GET | `/api/admin/users` | Yes | Admin | List all users |
| GET | `/api/admin/audit` | Yes | Admin | Paginated audit log |

---

## 7. Security Architecture

```mermaid
sequenceDiagram
    participant Client
    participant SecurityFilterChain
    participant JwtAuthFilter
    participant Controller
    participant AuthService
    participant JwtUtil

    rect rgb(230, 245, 255)
        Note over Client, JwtUtil: Login Flow
        Client->>Controller: POST /api/auth/login {username, password}
        Controller->>AuthService: authenticate(credentials)
        AuthService->>AuthService: BCrypt.matches(password, hash)
        AuthService->>JwtUtil: generateToken(username, role)
        JwtUtil-->>AuthService: JWT string
        AuthService-->>Controller: LoginResponse {token, role, username}
        Controller-->>Client: 200 OK + JWT
    end

    rect rgb(255, 245, 230)
        Note over Client, JwtUtil: Authenticated Request Flow
        Client->>SecurityFilterChain: GET /api/parking/zones<br/>Authorization: Bearer {JWT}
        SecurityFilterChain->>JwtAuthFilter: doFilterInternal()
        JwtAuthFilter->>JwtUtil: extractUsername(token)
        JwtAuthFilter->>JwtUtil: isTokenValid(token)
        JwtUtil-->>JwtAuthFilter: valid ✓
        JwtAuthFilter->>JwtAuthFilter: Set SecurityContext<br/>(username + role authority)
        JwtAuthFilter->>Controller: Proceed with request
        Controller-->>Client: 200 OK + response body
    end
```

### Security Controls Summary

| Control | Implementation |
|---------|---------------|
| Password Hashing | BCrypt via `BCryptPasswordEncoder` |
| Token Format | JWT (HMAC-SHA signed) with `sub` (username) and `role` claims |
| Token Expiry | Configurable via `jwt.expiration` property / `JWT_EXPIRATION` env var |
| Secret Management | `jwt.secret` in properties, overridable via `JWT_SECRET` env var |
| Session Policy | Stateless (`SessionCreationPolicy.STATELESS`) |
| CORS | Wildcard origin on `/api/**` |
| Role Enforcement | Spring Security `requestMatchers` + role-based access rules |

---

## 8. Frontend Architecture

```mermaid
graph TB
    subgraph SPA["Single Page Application (index.html)"]
        direction TB
        HTML["index.html<br/>(Shell + all views)"]

        subgraph JS["JavaScript Modules"]
            auth["auth.js<br/>Login / Register forms<br/>Token management"]
            api["api.js<br/>Centralized HTTP client<br/>JWT header injection"]
            app["app.js<br/>Router / View switcher<br/>Role-based navigation"]
            user["user-dashboard.js<br/>Zone browsing<br/>Reservation CRUD"]
            sec["security-dashboard.js<br/>QR scanning (jsQR)<br/>Verification & checkout"]
            admin["admin-dashboard.js<br/>Stats & charts (canvas)<br/>Zone CRUD / Audit log"]
            notif["notifications.js<br/>Notification bell<br/>Unread count polling"]
            prof["profile.js<br/>Profile editing<br/>Password change"]
        end

        CSS["styles.css"]
    end

    auth --> api
    app --> api
    user --> api
    sec --> api
    admin --> api
    notif --> api
    prof --> api

    app --> auth
    app --> user
    app --> sec
    app --> admin
    app --> notif
    app --> prof
```

The frontend is a **framework-free SPA**. `app.js` reads the JWT role claim and toggles visibility of dashboard sections via DOM manipulation. All HTTP communication goes through `api.js` which injects the `Authorization: Bearer` header automatically.

---

## 9. Key Flows

### 9.1 Reservation Lifecycle

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API as API Server
    participant DB as Database
    participant Scheduler

    Note over User, DB: Browsing & Reserving
    User->>Frontend: Browse parking zones
    Frontend->>API: GET /api/parking/zones-with-slots
    API->>DB: SELECT zones + slots
    DB-->>API: Zone & slot data
    API-->>Frontend: JSON response
    Frontend-->>User: Display zone cards with availability

    User->>Frontend: Select slot & time range
    Frontend->>API: POST /api/reservations
    API->>DB: Check for overlapping reservations
    DB-->>API: No overlap found ✓
    API->>DB: INSERT reservation (status=ACTIVE)<br/>UPDATE slot (status=RESERVED)
    API->>DB: INSERT notification
    API-->>Frontend: Reservation with QR code
    Frontend-->>User: Display QR code

    Note over User, Scheduler: Check-in at Gate
    User->>User: Show QR code at security gate

    Note over User, Scheduler: Automated Expiry (every 60s)
    Scheduler->>API: @Scheduled tick
    API->>DB: Find ACTIVE reservations past endTime
    DB-->>API: Expired reservations list
    API->>DB: UPDATE reservation (status=EXPIRED)<br/>UPDATE slot (status=AVAILABLE)
    API->>DB: INSERT expiry notification for each user
```

### 9.2 QR Verification & Checkout (Security Staff)

```mermaid
sequenceDiagram
    actor Security as Security Staff
    participant Frontend
    participant API as API Server
    participant DB as Database

    Security->>Frontend: Scan QR code via camera
    Frontend->>Frontend: jsQR decodes QR data
    Frontend->>API: GET /api/security/verify/{qrCode}
    API->>DB: SELECT reservation WHERE qrCode = ?
    DB-->>API: Reservation + User + Slot details
    API-->>Frontend: Verification result
    Frontend-->>Security: Display reservation details

    Security->>Frontend: Click "Checkout"
    Frontend->>API: POST /api/security/reservations/{id}/checkout
    API->>DB: UPDATE reservation (status=COMPLETED)
    API->>DB: UPDATE slot (status=AVAILABLE)
    API->>DB: INSERT notification for user
    API->>DB: INSERT audit log entry
    API-->>Frontend: Success
    Frontend-->>Security: Checkout confirmed ✓
```

### 9.3 Reservation State Machine

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: User creates reservation<br/>(slot → RESERVED)

    ACTIVE --> COMPLETED: Security staff checkout<br/>(slot → AVAILABLE)
    ACTIVE --> CANCELLED: User cancels<br/>(slot → AVAILABLE)
    ACTIVE --> EXPIRED: Scheduler detects past endTime<br/>(slot → AVAILABLE)

    COMPLETED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

### 9.4 Slot State Machine

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Initial state

    AVAILABLE --> RESERVED: Reservation created
    AVAILABLE --> MAINTENANCE: Admin/Security sets maintenance

    RESERVED --> AVAILABLE: Reservation cancelled / expired / completed
    RESERVED --> OCCUPIED: Security marks occupied

    OCCUPIED --> AVAILABLE: Security marks available

    MAINTENANCE --> AVAILABLE: Admin/Security clears maintenance
```

---

## 10. Deployment View

```mermaid
graph TB
    subgraph Host["Host Machine / VM"]
        subgraph JVM["JVM (Java 17)"]
            subgraph Boot["Spring Boot Application"]
                Tomcat["Embedded Tomcat :8080"]
                App["parking-1.0.0.jar"]
                Static["Static Resources<br/>(SPA Frontend)"]
            end
        end
        subgraph Storage["File System"]
            H2DB["./data/campus_parking.mv.db<br/>(H2 File Database)"]
        end
    end

    Browser["Browser"] -->|"HTTP :8080"| Tomcat
    App -->|"File I/O"| H2DB
```

### Build & Run

```bash
# Build
mvn clean package -DskipTests

# Run
java -jar target/parking-1.0.0.jar

# With custom JWT secret (recommended for production)
JWT_SECRET=your-secure-secret JWT_EXPIRATION=86400000 java -jar target/parking-1.0.0.jar
```

### Demo Seed Data

On first startup (empty database), `DataSeeder` creates:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password123` | ROLE_ADMIN |
| `security` | `password123` | ROLE_SECURITY |
| `user` | `password123` | ROLE_USER |

Plus 3 parking zones with pre-configured slots and sample reservations.

---

## 11. Non-Functional Characteristics

| Aspect | Current State | Production Recommendation |
|--------|--------------|--------------------------|
| **Scalability** | Single-instance monolith, embedded H2 | Migrate to PostgreSQL/MySQL, containerize, add load balancer |
| **Availability** | Single process, no redundancy | Deploy multiple instances behind reverse proxy, add health checks |
| **Data Persistence** | H2 file-backed (dev-grade) | External RDBMS with backups and replication |
| **Schema Mgmt** | JPA `ddl-auto=update` | Adopt Flyway or Liquibase migrations |
| **Observability** | Audit logs in DB only | Add Spring Actuator, structured logging, external monitoring |
| **Security** | JWT + BCrypt (solid foundation) | Restrict CORS origins, externalize secrets (vault), add rate limiting |
| **Testing** | Unit tests for 2 services | Add integration tests, API tests, E2E tests |
| **CI/CD** | Manual build & run | Add GitHub Actions pipeline with test, build, deploy stages |

---

*Document generated for the Campus Parking Management System project.*
