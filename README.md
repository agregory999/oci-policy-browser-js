# OCI Compartment and Policy Browser – Monorepo Guide

This is a full-stack example project (monorepo) for browsing Oracle Cloud Infrastructure (OCI) compartments and IAM policies, featuring a **React frontend** and a **Node.js/Express backend**.

## Table of Contents
- [Repository Structure](#repository-structure)
- [Getting Started: From Scratch](#getting-started-from-scratch)
- [Added Packages and Their Purpose](#added-packages-and-their-purpose)
- [Key Commands (in order)](#key-commands-in-order)
- [Project Conventions & Contribution](#project-conventions--contribution)
- [Subproject Docs](#subproject-docs)
- [Pre-commit Hooks and Automation](#pre-commit-hooks-and-automation)

---

## Repository Structure

- `/backend` – Node.js/Express REST API backend (serves OCI profile/compartment data).
- `/frontend` – React app (user interface for browsing compartments and policies).
    - Modular page/component structure: the UI is built as separate React components (see [frontend/README.md](frontend/README.md) for detailed structure), e.g., CompartmentBrowser (main page/component), PolicyTable, and PolicyDetail.
- `CONTRIBUTING.md` – General contribution and coding guidelines for the repo.
- `README.md` – This file (overview and top-level setup).
- `/backend/README.md` – Backend details, endpoints, and local dev.
- `/frontend/README.md` – Frontend details, dev server, and commands.

## Getting Started: From Scratch

Cloning and launching this project—step by step:

1. **Clone or Create Repo**
    ```sh
    git clone <repo-url>
    cd oci-javascript
    ```
    (Or initialize a new repo if starting empty:)
    ```sh
    git init
    ```

2. **Install Husky at root (for pre-commit hooks)**
    ```sh
    npm install husky --save-dev
    npx husky install
    ```

3. **Set up Backend**
    - Go to backend directory and init Node project:
      ```sh
      cd backend
      npm init -y
      ```
    - Install core packages:
      ```sh
      npm install express cors oci-sdk pino pino-pretty
      ```
    - Add dev dependencies:
      ```sh
      npm install --save-dev documentation
      ```
    - (Optional) Add tests/lint if expanding repo.

4. **Set up Frontend**
    - Go to frontend directory:
      ```sh
      cd ../frontend
      npm create vite@latest . -- --template react
      npm install
      ```
    - Add linting (ESLint):
      ```sh
      npm install --save-dev eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh
      npm run lint
      ```
    - Add documentation generator:
      ```sh
      npm install --save-dev documentation
      ```

5. **Add Husky pre-commit hook**
    Return to repo root (top level) and add pre-commit:
    ```sh
    cd ..
    npx husky add .husky/pre-commit "cd backend && npm run lint && npm run docs && cd ../frontend && npm run lint && npm run docs"
    ```

6. **Configure npm scripts**
    - In each package.json, include:
      - `"docs"` script for generating HTML docs from JSDoc comments (see [backend/package.json](backend/package.json) and [frontend/package.json](frontend/package.json))
      - `"lint"` script (ESLint) for frontend
      - Optionally, `"test"` script

7. **Run the Project**
    - Start backend:
      ```sh
      cd backend
      npm install
      npm start
      ```
    - In a new terminal, start frontend:
      ```sh
      cd frontend
      npm install
      npm run dev
      ```
    - Open [http://localhost:5173/](http://localhost:5173/) for UI.

---

## Added Packages and Their Purpose

Global (root):
- `husky` – Git hooks, to enforce lint/docs on commit.

Backend:
- `express` – HTTP server framework.
- `cors` – Cross-origin resource sharing.
- `oci-sdk` – Oracle Cloud Infrastructure SDK.
- `pino` – High-performance logging.
- `pino-pretty` – Development log formatting.
- `documentation` – JSDoc-to-HTML documentation builder (dev only).

Frontend:
- `react`, `react-dom` – React UI library.
- `vite` – Modern dev/build tool.
- `@eslint/js`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` – Code linting.
- `documentation` – Dev dependency for building docs from JSDoc comments.

---

## Key Commands (in order)

- `git init`
- `npm install husky --save-dev`
- `npx husky install`
- `cd backend && npm init -y && npm install ... && npm install --save-dev documentation`
- `cd ../frontend && npm create vite@latest . -- --template react && npm install`
- `npm install --save-dev eslint ...`
- `npm install --save-dev documentation`
- [edit package.json scripts for lint, docs, etc.]
- [create .husky/pre-commit as above]
- `cd backend && npm start`
- `cd frontend && npm run dev`

*See specific commands under [Getting Started](#getting-started-from-scratch) for details.*

---

## Project Conventions & Contribution

- All public functions/components should use JSDoc comments.
- Inline code is documented; generate docs with `npm run docs` in either subproject.
- Husky git hooks prevent accidental checkins with lint errors or out-of-date documentation.
- Contribution rules, code style, and JSDoc format are in [CONTRIBUTING.md](CONTRIBUTING.md).
- For backend and frontend specific details, see subproject READMEs below.

---

## Subproject Docs

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md) — includes a "Component Structure" section outlining each frontend module

---

## Pre-commit Hooks and Automation

- Commits run the following (via Husky):
    - For both `backend` and `frontend`: `npm run lint` and `npm run docs`
- These checks ensure code quality and up-to-date documentation on every commit.

---