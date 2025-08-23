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

## Architecture Overview

### Core Structure
- **Command-based architecture**: Uses nest-commander for CLI operations
- **Modular design**: Organized into feature modules under `src/modules/`
- **Database layer**: TypeORM entities and repositories for data persistence
- **Scraping layer**: Puppeteer-based services for web scraping

### Key Modules
- `commander/`: CLI command definitions (scrape, collect, deduplicate)
- `scraper/`: Core scraping service logic
- `anime/`: Anime data management (entities, repositories, services)
- `myanimelist/` & `anidb/`: Site-specific scraping implementations
- `puppeteer/`: Browser management and clustering
- `postgres-connector/`: Database configuration

### Main Commands
The application supports several CLI commands:
- `scrape -s myanimelist`: Scrape MyAnimeList data
- `scrape -s anidb`: Scrape AniDB data
- `collect`: Data collection operations
- `deduplicate`: Remove duplicate entries

### Database Schema
The application tracks:
- Anime metadata (titles, ratings, episodes)
- Characters and voice actors
- Staff information
- Links between different anime databases
- Episode information with air dates

### Configuration
- Database config in `ormconfig.js` (uses environment variables)
- Environment-specific settings via `.env` files
- SSL certificate support for production database connections

## Development Notes

- Uses TypeScript with strict configuration
- Puppeteer cluster management for concurrent scraping
- Comprehensive logging with Winston
- Database migrations managed through TypeORM CLI
- Yarn package manager (v4.3.1)
- Husky for git hooks and lint-staged for pre-commit formatting