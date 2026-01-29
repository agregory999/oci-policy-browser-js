# OCI Compartment and Policy Browser Frontend

This is the React frontend for the OCI Compartment and Policy Browser.

## Overview

- Provides a UI to browse OCI compartments and IAM policies.
- Communicates with the backend API to fetch profiles, compartments, and policies.
- Supports navigation and drilldown into OCI compartment hierarchy.
- Handles async loading and error states for a responsive UI.

## Project Structure

- `src/` - Main React source code
- `public/` - Static files

### Component Structure

The frontend is organized modularly, with each core feature separated as an individual React component:

- **CompartmentBrowser** (`src/components/CompartmentBrowser.jsx`): Main page for browsing OCI compartments and policies; handles navigation, drilldown, and fetches data.
- **PolicyTable** (`src/components/PolicyTable.jsx`): Displays a list/table of policies for the selected compartment; reusable and receives the `policies` list as a prop.
- **PolicyDetail** (`src/components/PolicyDetail.jsx`): Renders the full content/details for a single selected policy; shown when a policy is selected from the table.

Components are purposefully decoupled for easier extension, testing, and future changes.

Parent-child relationships and data flow primarily use React props and local component state. All async loading/networking logic is grouped into the relevant components to keep them self-contained.

## Getting Started

### Configuring Backend URL

The frontend communicates with the backend API at a configurable URL.  
**By default, it uses `http://localhost:3001` for local development.**

To support production deployment behind a Load Balancer (LB) or with a custom domain/path, set the backend API root using the environment variable:

- **Vite projects:**  
  Set `VITE_BACKEND_URL` to your backend's public API endpoint **before building the frontend**.

Example for local development (default):
```
npm run dev
# Frontend uses http://localhost:3001 as backend API root
```

Example for production (behind an LB, external domain):
```
VITE_BACKEND_URL="https://my-lb.example.com/api" npm run build
# or set in your deployment environment as needed
```

- All API calls from the frontend will use the given URL (see `src/components/CompartmentBrowser.jsx` for details).
- The value can be a full URL with optional path prefix if using path-based routing.

**Note:** If `VITE_BACKEND_URL` is not set, the default for all frontend API requests is `http://localhost:3001`.

1. Install dependencies:

   ```
   npm install
   ```

2. Run the development server:

   ```
   npm run dev
   ```

   The app will be available at [http://localhost:5173/](http://localhost:5173/) (by default).

3. Make sure the backend server is also running (see backend/README.md).

## Linting

- Run ESLint to check code quality:

  ```
  npm run lint
  ```

## Documentation

- Public functions/components should include JSDoc for documentation.
- To generate HTML documentation from JSDoc comments, run:

  ```
  npm run docs
  ```

  Output: `docs/` directory.

## Pre-commit hooks

This repo uses [Husky](https://typicode.github.io/husky/) for pre-commit hooks.
On commit, linting and documentation will be checked/built for both frontend and backend automatically.

## Contributing

See the root `CONTRIBUTING.md` for detailed guidelines.