# Build 3 architecture

## Layers

```mermaid
flowchart TD
  Routes[HTTP routes] --> Services[Application services]
  Services --> Rules[Domain rules]
  Services --> Repositories[Repositories]
  Repositories --> Data[(Database or in-memory data)]
```

- **Routes** may read HTTP input, call services and format responses; they may not contain business rules or access data directly.
- **Services** may coordinate rules and repositories; they may not depend on HTTP details or call routes.
- **Rules** may validate and transform domain data; they may not perform I/O or depend on outer layers.
- **Repositories** may read and write data; they may not decide business policy or call services, routes or rules.
- **Data** is persisted state; it does not call application layers.

## Data model

```mermaid
erDiagram
  USERS ||--o{ EVENTS : organizes
  EVENTS ||--|{ TICKET_TIERS : offers
  USERS ||--o{ BOOKINGS : makes
  TICKET_TIERS ||--o{ BOOKINGS : receives

  USERS {
    string id PK
    string name
    string email
  }
  EVENTS {
    string id PK
    string organizerId FK
    string title
    string city
    string venue
    datetime startsAt
    string status
  }
  TICKET_TIERS {
    string id PK
    string eventId FK
    string name
    integer priceCents
    integer capacity
  }
  BOOKINGS {
    string id PK
    string userId FK
    string tierId FK
    integer quantity
    integer amountCents
    string status
  }
```

## Booking life cycle

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> paid
  pending --> cancelled
  paid --> checked_in
  paid --> refunded
  paid --> cancelled
  cancelled --> [*]
  refunded --> [*]
  checked_in --> [*]
```

`cancelled`, `refunded` and `checked_in` are final states. A booking may be cancelled while pending or paid; a paid booking may also be refunded or checked in.
