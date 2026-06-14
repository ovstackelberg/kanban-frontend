# Kanban Board – Frontend

A lightweight kanban board. Plain HTML/CSS/JS — no build step required.

## Running locally

Open `index.html` directly in a browser, or serve the directory with any static file server, for example:

```bash
npx serve .
```

The app expects a backend API at `http://localhost:8001` by default (see [Configuration](#configuration)).

## Docker

### Build

```bash
docker build -t trello-clone-frontend .
```

### Run

```bash
docker run -p 8080:80 trello-clone-frontend
```

Open [http://localhost:8080](http://localhost:8080).

## Configuration

The API base URL is set at container startup via the `API_URL` environment variable:

```bash
docker run -p 8080:80 -e API_URL=http://my-backend:8001 trello-clone-frontend
```

If `API_URL` is not provided it defaults to `http://localhost:8001`.

The entrypoint script (`docker-entrypoint.sh`) writes this value into
`/usr/share/nginx/html/config.js` before starting nginx, making it available
to the browser as `window.API_URL`.
