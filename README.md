# LogForge - Log Processing System  

A NextJS application that processes log files using BullMQ and Supabase. The application allows users to upload log files through the UI, which are then stored in Supabase storage. Workers process these files and update the storage. The UI dashboard displays the processed information.

## Prerequisites

- Node.js (v20 or later)
- Docker and Docker Compose
- Supabase account
- Redis

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
MONITOR_KEYWORDS="ERROR,security,breach"
WORKER_CONCURRENCY=4
```

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start the NextJS application in development mode.

### Production Mode

```bash
npm run build
npm run start
```

### Running Workers

Start the workers to process log files:

```bash
npm run workers
```

### Running Tests

```bash
npm run test
```

## Docker Setup

The application is containerized with Docker Compose. To start all services:

```bash
docker-compose up
```

To run in detached mode:

```bash
docker-compose up -d
```

To pass env file:

```bash
docker-compose --env-file .env.local up 
```


To stop all services:

```bash
docker-compose down
```

## Architecture Overview

1. **Frontend**: NextJS application for uploading log files and displaying processed data
2. **Queue**: BullMQ for managing processing jobs
3. **Storage**: Supabase for storing raw and processed log files
4. **Workers**: Node.js workers that process the log files based on configured keywords

## Monitoring

The application monitors logs for specified keywords configured in the `MONITOR_KEYWORDS` environment variable.

## Scaling

Worker concurrency can be adjusted using the `WORKER_CONCURRENCY` environment variable.