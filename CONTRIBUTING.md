# Contributing to OCI Compartment and Policy Browser

Thank you for considering contributing to this project! This guide includes conventions and best practices for working on this JavaScript/Node.js/React repository.

## Filing Issues and Feature Requests

- Search existing issues before opening new ones.
- Provide as much detail as possible (steps to reproduce, environment info, screenshots).

## Branching & Pull Requests

- Make changes in a feature branch.
- Open a pull request (PR) with a descriptive title and summary.
- Reference any related issue in the PR body.

## Coding Standards

- **Code style:** Use the default ESLint configuration provided (`frontend/eslint.config.js`). Run `npm run lint` or `npx eslint .` before committing.
- **Formatting:** This project may use Prettier (add config if needed).
- **Comments:** Use clear, descriptive comments. For all public functions and components, add JSDoc-style blocks.
  - Example for JavaScript/Node.js:

    ```js
    /**
     * Gets OCI profiles from the config file.
     * @param {string} configPath - The path to the OCI config.
     * @returns {string[]} Array of profile names.
     */
    function listOciProfiles(configPath) { ... }
    ```
  - Example for React components:

    ```jsx
    /**
     * Main application component for OCI browser UI.
     * @returns {JSX.Element}
     */
    function App() { ... }
    ```

## Running Locally

- See `frontend/README.md` and `backend/README.md` for setup instructions.

## Linting, Testing & Docs

- **Lint:** Run `npm run lint` in the frontend/backend before pushing.
- **Tests:** Add tests for new functionality (if test infra present).
- **Docs:** Keep README and inline comments up-to-date.
- [Optional] To build/generate HTML docs from JSDoc blocks, install [documentation.js](https://documentation.js.org/) or a similar tool and run `npx documentation build src/**/*.js -f html -o docs`.

## Pre-commit Hooks

- Pre-commit and pre-push checks for linting and tests are recommended. This repo uses [Husky](https://typicode.github.io/husky/) for Git hooks configuration (coming soon).

## Licensing

By contributing, you agree to license your work under the project's license.