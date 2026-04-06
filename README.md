# Finance Dashboard API

A role-based REST API for a finance dashboard platform built with Node.js, Express, MongoDB, and JWT authentication.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 3. Seed development data (optional)
npm run seed

# 4. Start the server
npm run dev       # development (nodemon)
npm start         # production
```

---

## Architecture & Design Decisions

### Layered Architecture
```
Routes → Controllers → Services → Models
```
- **Routes** declare endpoints and apply middleware chains
- **Controllers** handle HTTP in/out (parsing, response shaping)
- **Services** contain business logic and aggregation queries (independently testable)
- **Models** own schema definition and document-level methods

This separation means aggregation logic in `dashboardService.js` can be unit-tested without spinning up HTTP.

### Role-Based Access Control

Three roles with explicit permission boundaries:

| Action                  | Viewer | Analyst | Admin |
|-------------------------|--------|---------|-------|
| Dashboard routes        | ✓      | ✓       | ✓     |
| Read finance records    |        | ✓       | ✓     |
| Create/edit/delete records |     |         | ✓     |
| Manage users            |        |         | ✓     |

RBAC is implemented as composable middleware:

```js
router.delete("/:id", authenticate, authorize("admin"), deleteRecord);
```

`authenticate` resolves the user from JWT, `authorize` checks the role. Each piece is independent and reusable.

### Soft Delete
Records and users are never hard-deleted. Records get a `deletedAt` timestamp; users get `status: "inactive"`. A Mongoose pre-find hook transparently filters deleted records from all queries. This preserves audit history and makes undo trivial.

### Validation Strategy
Zod schemas are defined at the top of each controller file — close to where they're used — rather than in a separate schemas directory. For a project this size, proximity > ceremony.

### Error Handling
All errors are instances of `ApiError(statusCode, message)` or native Mongoose errors. A single centralized handler in `errorMiddleware.js` normalizes everything into a consistent JSON envelope, including handling of duplicate key errors, CastErrors, and ValidationErrors automatically.

### MongoDB Aggregation
Dashboard aggregations use multi-stage pipelines in `dashboardService.js`. Key patterns:
- `$group` by type for summary totals
- `$group` by category then re-group for nested breakdowns
- Month/year extraction via `$year`/`$month` for trend data

---

## Project Structure

```
src/
├── config/
│   └── db.js                  # Mongoose connection
├── controllers/
│   ├── authController.js      # Register + login logic
│   ├── userController.js      # User CRUD (admin)
│   ├── financeController.js   # Record CRUD with filtering
│   └── dashboardController.js # Thin wrappers over service
├── middleware/
│   ├── authMiddleware.js      # JWT verification + user hydration
│   ├── roleMiddleware.js      # Role-based access guard
│   └── errorMiddleware.js     # Centralized error normalization
├── models/
│   ├── User.js                # Schema + bcrypt pre-save hook
│   └── FinanceRecord.js       # Schema + soft-delete pre-find hook
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── financeRoutes.js
│   └── dashboardRoutes.js
├── services/
│   └── dashboardService.js    # All MongoDB aggregation pipelines
├── utils/
│   ├── apiError.js            # Custom error class
│   └── seed.js                # Dev seed script
└── app.js                     # Express setup, middleware, route mounting
server.js                      # Entry point (DB connect → listen)
```

---

## API Reference

### Auth

| Method | Endpoint         | Description        |
|--------|------------------|--------------------|
| POST   | /api/auth/register | Create account   |
| POST   | /api/auth/login    | Get JWT token    |

**Register**
```json
POST /api/auth/register
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "analyst"
}

// Response 201
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "analyst" }
}
```

**Login**
```json
POST /api/auth/login
{ "email": "jane@example.com", "password": "secret123" }

// Response 200
{ "success": true, "token": "eyJhbGci...", "user": { ... } }
```

---

### Finance Records

All require `Authorization: Bearer <token>`

| Method | Endpoint           | Role Required      |
|--------|--------------------|--------------------|
| GET    | /api/records       | analyst, admin     |
| GET    | /api/records/:id   | analyst, admin     |
| POST   | /api/records       | admin              |
| PUT    | /api/records/:id   | admin              |
| DELETE | /api/records/:id   | admin (soft)       |

**Query parameters for GET /api/records**
```
?type=income|expense
?category=food|rent|salary|...
?startDate=2024-01-01
?endDate=2024-12-31
?search=keyword
?page=1&limit=20
```

**Create Record**
```json
POST /api/records
Authorization: Bearer <admin-token>
{
  "amount": 3500,
  "type": "income",
  "category": "salary",
  "date": "2024-06-01",
  "notes": "June salary"
}

// Response 201
{
  "success": true,
  "data": {
    "_id": "...",
    "amount": 3500,
    "type": "income",
    "category": "salary",
    "date": "2024-06-01T00:00:00.000Z",
    "notes": "June salary",
    "createdBy": "...",
    "deletedAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### Dashboard

All authenticated users (including viewers) can access these.

| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| GET    | /api/dashboard/summary          | Income / expense / balance |
| GET    | /api/dashboard/category-breakdown | Totals by category       |
| GET    | /api/dashboard/recent           | Last 5 transactions        |
| GET    | /api/dashboard/monthly-trends   | Month-by-month totals      |

**Summary Response**
```json
{
  "success": true,
  "data": {
    "totalIncome": 24500,
    "totalExpenses": 11200,
    "netBalance": 13300,
    "recordCount": { "income": 12, "expense": 28 }
  }
}
```

**Monthly Trends Response**
```json
{
  "success": true,
  "data": [
    {
      "year": 2024,
      "month": 5,
      "label": "2024-05",
      "totals": [
        { "type": "income", "total": 4200, "count": 3 },
        { "type": "expense", "total": 1800, "count": 7 }
      ]
    }
  ]
}
```

---

### Users (Admin only)

| Method | Endpoint       | Description             |
|--------|----------------|-------------------------|
| GET    | /api/users     | List all users (paged)  |
| GET    | /api/users/:id | Get user by ID          |
| PUT    | /api/users/:id | Update role/status      |
| DELETE | /api/users/:id | Deactivate user (soft)  |

---

## Error Response Shape

All errors follow this envelope:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

| Code | Meaning               |
|------|-----------------------|
| 400  | Validation failed     |
| 401  | Missing/invalid token |
| 403  | Insufficient role     |
| 404  | Resource not found    |
| 409  | Duplicate (e.g. email)|
| 500  | Unexpected server error |

---

## Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/finance_dashboard
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

## Seed Accounts (after `npm run seed`)

| Email              | Password    | Role     |
|--------------------|-------------|----------|
| admin@demo.com     | password123 | admin    |
| analyst@demo.com   | password123 | analyst  |
| viewer@demo.com    | password123 | viewer   |
