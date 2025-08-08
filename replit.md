# Replit.md

## Overview

Mar de Cores is an e-commerce platform specializing in makeup and cosmetics. The application serves as a digital catalog for beauty products with a sophisticated design featuring the brand's signature petrol blue color scheme. The platform includes both a customer-facing storefront and an administrative panel for comprehensive business management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript running on Vite for fast development and hot reloading
- **Styling**: Tailwind CSS with custom brand color variables (petrol blue, gold accents)
- **Component Library**: Shadcn/ui components built on Radix UI primitives for accessibility
- **State Management**: TanStack React Query for server state management and Zustand for admin authentication
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom dark/light theme provider with CSS variables

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript throughout the entire stack
- **API Design**: RESTful endpoints with structured route handling
- **File Structure**: Monorepo structure with shared schema between client and server
- **Development**: Hot reload capabilities with Vite integration

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless database connection
- **Schema**: Centralized schema definition in shared directory for type consistency
- **Migrations**: Drizzle Kit for database migrations and schema management

### Authentication and Authorization
- **Admin Panel**: Username/password authentication with persistent sessions
- **Session Management**: Zustand store with localStorage persistence
- **Route Protection**: Client-side route guards for admin access
- **Public Access**: No authentication required for public product catalog

### External Dependencies

#### Third-Party Services
- **Cloud Storage**: Google Cloud Storage integration for file uploads
- **File Upload**: Uppy.js for drag-and-drop file handling with AWS S3 compatibility
- **Communication**: WhatsApp integration for customer inquiries and support
- **Database**: Neon Database (PostgreSQL) for cloud-hosted data storage

#### Development and Build Tools
- **Build System**: Vite for frontend bundling and esbuild for server compilation
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Code Quality**: ESLint and TypeScript compiler checks
- **Styling**: PostCSS with Tailwind CSS and Autoprefixer

#### UI and UX Libraries
- **Icons**: Lucide React icons and Font Awesome for comprehensive icon coverage
- **Fonts**: Google Fonts (Inter) for consistent typography
- **Animations**: Custom CSS animations with Tailwind utilities
- **Form Handling**: React Hook Form with Zod validation for type-safe forms
- **Toast Notifications**: Radix UI toast system for user feedback

The architecture emphasizes type safety, performance, and maintainability while providing a smooth user experience for both customers browsing products and administrators managing the business operations.