# Sistema de Requisições de Saúde - Alexandria/RN

## Overview

This project is a comprehensive health management system for the Municipality of Alexandria/RN. Its main purpose is to streamline the management of medical exam and consultation requests, covering patient registration, appointment scheduling, multi-step approval workflows, and secure document management. The system is designed for use by healthcare units, regulatory departments, and administrative staff, featuring robust role-based access control. The vision is to enhance the efficiency of public health services and improve patient care coordination within the municipality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript, using Vite for optimized builds. Styling is managed with Tailwind CSS, incorporating a custom design system tailored for municipal healthcare aesthetics. UI components leverage Radix UI primitives and shadcn/ui for accessibility and consistency.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI, shadcn/ui, TanStack Query for server state, Wouter for routing.
- **Backend**: Node.js with Express.js, TypeScript, ES modules. Authentication is session-based with bcrypt for password hashing and PostgreSQL for session storage. Multer handles file uploads. APIs are RESTful with structured error handling.
- **Data Storage**: PostgreSQL with Drizzle ORM for primary data and schema management (Drizzle Kit). Local filesystem is used for uploaded documents and patient photos.

### Feature Specifications
- **User Management**: Role-based access control (admin, recepcao, regulacao), local authentication, secure password management, and association of users with specific health units.
- **Patient Management**: Comprehensive patient registration with CPF validation, document upload capabilities (identity, medical records), autocomplete patient search, and Zod schema-based data validation. Patient editing and history viewing are supported.
- **Request Processing**: Multi-step approval workflow (Reception → Regulation → Secretary), configurable exam/consultation types with quota management, urgent request handling, and real-time status tracking. Requests can be forwarded to other months, which updates their creation date for reporting purposes. A suspension system allows requests to be marked as suspended with a reason, and later corrected.
- **File Management**: Support for PDF and image uploads (identity documents, medical records, exam results). Includes a direct web scanner using MediaDevices API for document capture via camera, and intelligent detection/integration with installed scanner software (e.g., HP Smart, Canon IJ Scan). Document uploads are mandatory for requests and are visually previewed.
- **Reporting**: Administrative dashboards provide detailed reports on request statuses (pending, received, accepted, completed) and financial values, categorized by exam/consultation type. Reports can be filtered by month and year, and patient reports are printable with official formatting.
- **Notifications**: A push notification system allows administrators to send targeted messages to users by role, displayed as banners within the application.
- **Performance Optimization**: Mobile panel features intelligent caching, memoization, and debouncing for improved responsiveness.

### System Design Choices
- **Unified Filter System**: A global month/year filter applies across all administrative dashboards and reports for consistent data views.
- **Concurrency Protection**: Implemented protection against duplicate request creation from multiple clicks.
- **Security**: Session expiration is set to 5 hours.
- **Error Handling**: Robust error handling is implemented across frontend and backend.
- **Modular Design**: The system is structured into distinct frontend and backend architectures, with clear separation of concerns.

## External Dependencies

- **Database**: PostgreSQL 16+
- **Runtime**: Node.js 20+
- **Authentication**: bcrypt, express-session, connect-pg-simple
- **File Handling**: Multer
- **ORM**: Drizzle ORM, Drizzle Kit
- **Frontend Utilities**: TanStack Query, Wouter, Radix UI, shadcn/ui, Tailwind CSS, Lucide React (icons)
- **Development Tools**: TypeScript, Vite, ESBuild