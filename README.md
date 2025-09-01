# Anime Scraper

A NestJS-based anime scraper application that collects anime data from various sources (primarily MyAnimeList and AniDB). It uses TypeORM with PostgreSQL for data persistence and Puppeteer for web scraping.

## Description

This application is built with the [Nest](https://github.com/nestjs/nest) framework and provides command-line tools for scraping anime data, including metadata, characters, staff, and episodes.

## Installation

```bash
# Install dependencies
yarn install

# Or with npm
npm install
```

## Available Commands

This application provides several CLI commands for scraping and managing anime data:

### Scrape Commands

#### Regular Scraping
```bash
# Build first
yarn build

# Scrape MyAnimeList data
ENV=local node dist/src/main.js scrape --site myanimelist

# Scrape with specific options
ENV=local node dist/src/main.js scrape --site myanimelist --limit 100 --headless

# Scrape with URL file input
ENV=local node dist/src/main.js scrape --site myanimelist -f urls.json --headless

# Scrape with exclusion list
ENV=local node dist/src/main.js scrape --site myanimelist --exclude-file excluded_urls.txt --headless

# Scrape only new anime from last N days
ENV=local node dist/src/main.js scrape --site myanimelist --new --days 7 --headless

# Scrape AniDB data
ENV=local node dist/src/main.js scrape --site anidb --headless

# One-liner with build
yarn build && ENV=local node dist/src/main.js scrape --site myanimelist -f urls.json --headless
```

#### Seasonal Scraping
```bash
# Build first
yarn build

# Scrape seasonal anime (new feature!)
ENV=local node dist/src/main.js seasonal --season SUMMER_2025
ENV=local node dist/src/main.js seasonal --season WINTER_2024
ENV=local node dist/src/main.js seasonal --season SPRING_2024 --headless
ENV=local node dist/src/main.js seasonal --season FALL_2023 --limit 50 --headless

# One-liner examples
yarn build && ENV=local node dist/src/main.js seasonal --season SUMMER_2025 --headless
yarn build && ENV=local node dist/src/main.js seasonal --season WINTER_2024 --limit 100 --headless

# Available seasons: SPRING_YYYY, SUMMER_YYYY, FALL_YYYY, WINTER_YYYY
```

#### Data Collection
```bash
# Build first
yarn build

# Collect anime data using puppeteer cluster
ENV=local node dist/src/main.js collect

# Collect newly added anime
ENV=local node dist/src/main.js new

# One-liner examples
yarn build && ENV=local node dist/src/main.js collect
yarn build && ENV=local node dist/src/main.js new
```

#### Data Management
```bash
# Build first
yarn build

# Remove duplicate entries
ENV=local node dist/src/main.js deduplicate

# Validate anime data integrity
ENV=local node dist/src/main.js validate

# One-liner examples
yarn build && ENV=local node dist/src/main.js deduplicate
yarn build && ENV=local node dist/src/main.js validate
```

### Scrape Command Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--site` | `-s` | Site to scrape (myanimelist, anidb) | `--site myanimelist` |
| `--limit` | `-l` | Number of items to scrape | `--limit 100` |
| `--headless` | `-h` | Run browser in headless mode | `--headless` |
| `--file` | `-f` | JSON file with URLs to scrape | `-f urls.json` |
| `--exclude-file` | `-e` | Text file with URLs to exclude | `--exclude-file excluded.txt` |
| `--new` | `-n` | Scrape only newly added anime | `--new` |
| `--days` | `-d` | Days to look back for new anime | `--days 7` |

### Seasonal Command Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--season` | `-s` | Season to scrape | `--season SUMMER_2025` |
| `--headless` | `-h` | Run browser in headless mode | `--headless` |
| `--limit` | `-l` | Limit number of anime to scrape | `--limit 50` |

## Typical Workflow

### Quick Start
```bash
# Most common usage pattern
yarn build && ENV=local node dist/src/main.js scrape --site myanimelist -f urls.json --headless
```

### Production Workflow
```bash
# 1. Build the application
yarn build

# 2. Set environment and run command
ENV=production node dist/src/main.js scrape --site myanimelist --headless --limit 1000

# 3. For seasonal scraping
ENV=production node dist/src/main.js seasonal --season SUMMER_2025 --headless
```

### Development Workflow
```bash
# 1. Install dependencies
yarn install

# 2. Run database migrations
npm run typeorm -- migration:run

# 3. Build and scrape
yarn build && ENV=local node dist/src/main.js scrape --site myanimelist --headless
```

## Development Commands

### Build and Run
```bash
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

# Generate migration
npm run typeorm -- migration:generate -n MigrationName

# Run migrations
npm run typeorm -- migration:run

# Revert migration
npm run typeorm -- migration:revert
```

## Configuration

### Database Setup
The application requires a PostgreSQL database. Configure your database connection using environment variables:

```bash
PGHOST=localhost
PGPORT=5432
PGUSERNAME=your_username
PGPASSWORD=your_password
PGDATABASE=anime_scraper
ENV=local
```

For production environments, place SSL certificates in `secrets/cert` directory.

### Environment Variables
Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
PGHOST=localhost
PGPORT=5432
PGUSERNAME=anime_scraper
PGPASSWORD=your_secure_password
PGDATABASE=anime_scraper

# Environment
ENV=local

# Optional: Logging
NESTJS_LOGS_ENABLED=true
```

## Architecture

This application uses a modular architecture with the following key components:

- **Command-based CLI**: Uses nest-commander for CLI operations
- **Puppeteer Clustering**: Manages concurrent browser instances for efficient scraping
- **TypeORM Integration**: Handles database operations and migrations
- **Site-specific Services**: Separate services for MyAnimeList and AniDB
- **Error Handling**: Comprehensive retry logic and captcha detection

### Scraped Data
The application collects the following data:

- **Anime Metadata**: Titles (EN/JP), synopsis, ratings, rankings, genres
- **Episodes**: Individual episode data with air dates and titles
- **Characters**: Character information with voice actors
- **Staff**: Production staff and voice actor details
- **Cross-site Links**: AniDB to MyAnimeList mappings
- **Seasonal Data**: Season/year information for seasonal anime

## Features

- ✅ Multi-site scraping (MyAnimeList, AniDB)
- ✅ Seasonal anime scraping with automatic season tagging
- ✅ Concurrent scraping with puppeteer-cluster
- ✅ Automatic captcha detection and handling
- ✅ Database migrations and data persistence
- ✅ Comprehensive error handling and retry logic
- ✅ Duplicate detection and removal
- ✅ Character and staff relationship mapping
- ✅ Episode-level data collection

## License

This project is MIT licensed.
