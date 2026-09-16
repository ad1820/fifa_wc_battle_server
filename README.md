# FIFA World Cup Battle — Server

Express API for the FIFA World Cup Battle application. It supports authenticated game requests, football data workflows, persistent storage, caching, and AI-assisted match generation.

## Technology

- Node.js and Express
- MongoDB with Mongoose
- Firebase Admin for authentication
- Upstash Redis for caching
- LangChain and OpenAI-compatible models

## Responsibilities

- Verify authenticated client requests
- Serve team and tournament data
- Generate and persist team-battle results
- Cache reusable data and expensive operations
- Provide the API consumed by the [React client](https://github.com/ad1820/fifa_wc_battle_client)

## Local development

### Prerequisites

- Node.js 20+
- npm
- MongoDB
- Firebase service-account credentials
- Upstash Redis credentials
- An API key for the configured language model

### Setup

```bash
git clone https://github.com/ad1820/fifa_wc_battle_server.git
cd fifa_wc_battle_server
npm install
npm run dev
```

Create a local `.env` file containing the configuration required by the application. Keep service-account values and API keys out of version control.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the server with Nodemon |
| `npm start` | Start the production server |

## Project structure

- `src/` — application source code
- `scripts/` — data preparation and maintenance utilities
- `json_attributes/` — structured football data used by the application

## API documentation

The exact routes and payloads should be documented as the API stabilizes. When extending the service, include example requests, validation rules, authentication requirements, and error responses alongside each route.

## Roadmap

- Add automated route and service tests
- Publish an environment-variable reference
- Document stable API endpoints
- Add continuous integration for linting and tests
