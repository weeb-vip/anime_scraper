# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an anime scraper application built with NestJS that collects anime data from various sources (primarily MyAnimeList and AniDB). It uses TypeORM with PostgreSQL for data persistence and Puppeteer for web scraping. The application is command-line driven using nest-commander.

## Common Development Commands

### Build and Development
```bash
# Install dependencies
yarn install

# Development with hot reload
npm run start:dev

# Build the application
npm run build

# Production mode
npm run start:prod
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Database Operations
```bash
# Run TypeORM CLI commands
npm run typeorm -- <command>

# Example: Generate migration
npm run typeorm -- migration:generate -n MigrationName

# Example: Run migrations
npm run typeorm -- migration:run
```

### CLI Usage Examples
```bash
# Scrape MyAnimeList with specific options
npm run start scrape -s myanimelist -l 100 -h

# Scrape with URL file input
npm run start scrape -s myanimelist -f urls.json

# Scrape only new anime from last N days
npm run start scrape -s myanimelist -n -d 7

# Collect data using puppeteer cluster
npm run start collect

# Remove duplicate entries
npm run start deduplicate
```

## Architecture Overview

### Core Structure
- **Command-based architecture**: Uses nest-commander for CLI operations
- **Modular design**: Organized into feature modules under `src/modules/`
- **Database layer**: TypeORM entities and repositories for data persistence
- **Scraping layer**: Puppeteer-based services for web scraping
- **Cluster management**: Puppeteer-cluster for concurrent browser operations

### Key Modules
- `commander/`: CLI command definitions (scrape, collect, deduplicate, new)
- `scraper/`: Core scraping service orchestration
- `anime/`: Anime data management (entities, repositories, services)
- `myanimelist/` & `anidb/`: Site-specific scraping implementations
- `puppeteer/`: Browser management and clustering with ClusterManager
- `postgres-connector/`: Database configuration and connection
- `scrape_record/`: Tracking scraping operations and progress
- `config/`: Configuration management for environment-specific settings

### Application Entry Points
- `src/main.ts`: Application entry point that starts the server
- `src/server/server.app.ts`: Uses CommandFactory to run CLI commands without closing
- CLI commands are bootstrapped through `BootstrapModule.forRoot()`

### Scraping Architecture
- **ClusterManager**: Manages puppeteer-cluster instances with context-based concurrency
- **Site-specific services**: MyAnimeList and AniDB services handle scraping logic
- **URL management**: Supports input from JSON files and exclusion lists
- **Error handling**: Comprehensive retry logic and error tracking
- **Progress tracking**: Records scraping operations for resumption

### Database Schema
The application tracks:
- **Anime metadata**: titles, ratings, episodes, air dates, rankings
- **Characters and staff**: voice actors, production staff with linking tables
- **Cross-site linking**: MyAnimeList to AniDB mappings
- **Episode data**: individual episodes with Japanese/English titles and air dates
- **Language support**: Multi-language title and metadata storage

### Configuration
- Database config in `ormconfig.js` (uses environment variables)
- SSL certificate support for production database connections (`secrets/cert`)
- Environment-specific entity and migration paths
- Puppeteer cluster configuration with browser arguments and concurrency settings

## Development Notes

- Uses TypeScript with strict configuration
- Puppeteer cluster management with context-based concurrency for performance
- Comprehensive logging with Winston logger injection
- Database migrations managed through TypeORM CLI
- Yarn package manager (v4.3.1)
- Husky for git hooks and lint-staged for pre-commit formatting
- No test files currently present in the codebase