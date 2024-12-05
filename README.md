# MG-Tracko: Expedite Material Request Tracker

A web application for tracking and managing "must-go" and expedite material requests, facilitating communication between customer service and warehouse teams.

## Features

- Real-time queue updates for expedite requests
- Role-based access control (Admin, Customer Service, Warehouse)
- Comprehensive request tracking with status updates
- Part information management
- Responsive design for all devices
- Dark/Light theme support

## Tech Stack

- **Frontend:** Next.js 14 with TypeScript
- **Styling:** Tailwind CSS with ShadCN UI components
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Local authentication with secure password handling
- **Hosting:** Vercel (Frontend) + Neon.tech (PostgreSQL)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (local or Neon.tech)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/mg-tracko.git
cd mg-tracko
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and other configuration.

4. Initialize the database:

```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Project Structure

```
mg-tracko/
├── src/
│   ├── app/          # Next.js 14 app directory
│   ├── components/   # Reusable UI components
│   └── lib/          # Utility functions and configurations
├── prisma/
│   └── schema.prisma # Database schema
├── public/           # Static assets
└── docs/            # Project documentation
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:studio` - Open Prisma Studio

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
