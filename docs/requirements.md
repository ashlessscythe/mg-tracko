### **`requirements.md`**

---

# Expedite Tracker Requirements Document

## **Overview**

The Expedite Tracker is a web application for tracking and managing "must-go" and expedite material requests. It serves as a communication and workflow platform between customer service and warehouse teams, ensuring efficient processing of high-priority shipments.

---

## **Tech Stack**

- **Frontend:** Next.js (with local authentication)
- **Backend:** Prisma ORM with PostgreSQL hosted on Neon.tech
- **UI Framework:** Tailwind CSS (theme-aware and responsive design)
- **UI Components:** ShadCN (latest version)
- **Design Aesthetic:** Sleek, professional, corporate UI
- **Key Features:** Responsive design, real-time queue updates, search and filter capabilities

---

## **Key Features**

### **User Roles**

1. **Admin**

   - Manage users and permissions.
   - Monitor and configure system settings.

2. **Customer Service**

   - Submit expedite requests with details like shipment numbers, part numbers, and pallet counts.
   - Update or cancel requests as needed.

3. **Warehouse Staff**
   - Access a queue of expedite requests.
   - Mark requests as processed or in-progress.

---

## **Database Schema**

### **Entities and Relationships**

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  password     String
  role         Role      // Enum: "ADMIN", "CUSTOMER_SERVICE", "WAREHOUSE"
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model MustGoRequest {
  id              String     @id @default(cuid())
  shipmentNumber  String
  partNumber      String
  palletCount     Int
  status          RequestStatus @default(PENDING) // Enum: "PENDING", "IN_PROGRESS", "COMPLETED"
  routeInfo       String?
  additionalNotes String?
  createdBy       String
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

model RequestLog {
  id              String     @id @default(cuid())
  mustGoRequestId String
  action          String     // "CREATED", "UPDATED", "CANCELLED", "PROCESSED"
  performedBy     String
  timestamp       DateTime   @default(now())
}

model PartInfo {
  id         String   @id @default(cuid())
  partNumber String   @unique
  description String?
  weight     Float?
  dimensions String?  // Format: "LxWxH"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

enum Role {
  ADMIN
  CUSTOMER_SERVICE
  WAREHOUSE
}

enum RequestStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}
```

---

## **Authentication and Authorization**

1. **Local Authentication**

   - Email and password-based login.
   - Passwords hashed and salted for security.

2. **Authorization**
   - Role-based access control (RBAC):
     - **Admin:** Full access to all features.
     - **Customer Service:** Create, update, and cancel requests.
     - **Warehouse Staff:** View and process requests.

---

## **UI Design**

### **General Requirements**

- Sleek corporate design with a professional look.
- Fully responsive and optimized for mobile, tablet, and desktop.
- Dark mode and light mode support using theme-aware Tailwind classes.
- Use ShadCN components for a consistent, polished interface.

### **Key Pages**

1. **Login/Signup Page**

   - Email/password form.
   - Dark and light mode support.

2. **Dashboard**

   - Overview of current expedite requests by status (e.g., Pending, In Progress, Completed).
   - Quick search bar for shipment numbers or part numbers.
   - Metrics display (e.g., total pallets, requests in progress).

3. **Request Submission Form**

   - Fields: Shipment Number, Part Number, Pallet Count, Route Info, Notes.
   - Validation and error handling.

4. **Request Queue (Warehouse View)**

   - List of requests with sortable columns (e.g., Priority, Created Date).
   - Buttons for marking requests as “In Progress” or “Completed.”

5. **Request Detail View**

   - Display all details of a single request.
   - Include a history log of actions taken.

6. **Admin Panel**
   - Manage users, roles, and system configurations.
   - View activity logs and performance metrics.

---

## **APIs**

### **MustGo Requests**

- `POST /api/mustgo`

  - Create a new expedite request.

- `GET /api/mustgo`

  - Fetch all requests, optionally filtered by status or part number.

- `PUT /api/mustgo/:id`

  - Update a specific request’s details.

- `DELETE /api/mustgo/:id`
  - Delete a request.

### **Part Info**

- `POST /api/parts`

  - Add part metadata.

- `GET /api/parts`
  - Fetch part metadata, optionally filtered by part number.

---

## **Development Priorities**

1. Implement the schema and build a functional API using Prisma.
2. Develop a responsive frontend with ShadCN components.
3. Integrate authentication and role-based access control.
4. Ensure proper error handling, validation, and real-time updates.
5. Add search, filter, and sort functionality for requests.
6. Implement and test dark mode support.

---

## **Testing and Deployment**

- Automated tests for database operations and API endpoints.
- Frontend testing for responsiveness and accessibility.
- Deployment on Neon.tech for PostgreSQL and Vercel for the Next.js app.

---
