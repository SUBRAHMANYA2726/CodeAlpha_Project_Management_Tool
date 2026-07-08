# CodeAlpha Project Management Tool

A polished full-stack project management platform built with React, Express, TypeScript, and Firebase Firestore. It combines task tracking, kanban workflows, team collaboration, analytics, file management, and AI-assisted research in a single modern dashboard.

## Project Description

This application is designed for teams that need a central workspace for planning work, tracking progress, and communicating clearly. It provides an intuitive interface for managing projects, organizing tasks across workflows, and keeping stakeholders updated in real time.

## Features

- Executive dashboard with project health insights
- Interactive Kanban board for task management
- Calendar and timeline-based planning views
- Team chat and activity feed
- Authentication with email and Google sign-in
- File upload and attachments management
- AI-powered research and project insights
- Responsive desktop and tablet-friendly interface

## Dashboard Overview

The dashboard highlights key metrics such as task completion, active workstreams, project status, and team activity. It is intended to give product managers and teams a quick snapshot of progress at a glance.

## Kanban Board

The Kanban experience supports drag-and-drop task movement across columns, task prioritization, labels, checklists, comments, and assignment tracking.

## Authentication

Users can sign up, log in, and access protected project features securely. Google authentication is also supported for faster onboarding.

## Team Collaboration

The app includes team messaging, shared project context, comments, and activity logs to support better collaboration.

## Real-Time Features

The platform is built around shared project state so users can interact with live updates across the workspace.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: Firebase Firestore
- Authentication: JWT + Firebase Auth integration
- UI Motion: Motion library

## Folder Structure

```text
src/
  components/
  lib/
  server/
  types.ts
  App.tsx
server.ts
vite.config.ts
```

## Installation

```bash
npm install
npm run dev
```

## MongoDB Setup

This project uses Firebase Firestore for persistence. Configure the app using the provided Firebase configuration file.

## Socket.IO Setup

The current build uses a lightweight server-driven architecture for shared state and collaboration features. If you plan to extend it with real-time sockets, you can add Socket.IO with the same backend entry point.

## Environment Variables

Create a local environment file using the example template:

```bash
cp .env.example .env
```

Required variables:

- PORT
- MONGODB_URI
- JWT_SECRET
- CLIENT_URL
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

## Screenshots

Add screenshots to this section before publishing to GitHub.

## API Documentation

The application exposes REST endpoints for authentication and project data management. These endpoints are initialized through the Express server in server.ts.

## Database Collections

The server persists app state in Firestore collections such as:

- users
- projects
- columns
- tasks
- comments
- teamMessages
- activityLogs
- notifications
- attachments

## Deployment Guide

1. Build the production bundle.
2. Deploy the backend and static assets to your hosting platform.
3. Set environment variables securely in the deployment dashboard.
4. Configure the Firebase config file for your environment.

Example:

```bash
npm run build
```

## Future Improvements

- Add real-time socket synchronization
- Introduce advanced analytics and reporting
- Add drag-and-drop file attachments and comments
- Improve mobile optimization and accessibility

## License

This project is licensed under the MIT License.

## Author

Developed as part of the CodeAlpha internship project portfolio.
