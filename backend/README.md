# OCI Compartment and Policy Browser Backend

This is the backend API for the OCI Compartment and Policy Browser.

## Overview

- Serves as the backend for browsing compartments and IAM policies in OCI.
- Interfaces with Oracle Cloud Infrastructure using the `oci-sdk`.
- Exposes REST endpoints for the frontend to query OCI profiles, compartments, and policies.
- Handles logging (to console and file), error handling, and CORS.

## Main API Endpoints

- `GET /api/profiles`  
  List configured OCI CLI profiles on the server.

- `GET /api/compartments?profile=PROFILE&parent=PARENT_ID`  
  List sub-compartments for a specified OCI profile and (optionally) a parent compartment.

- `GET /api/policies?profile=PROFILE&compartmentId=OCID`  
  List IAM policies for a given compartment and profile.

## Quickstart

1. Install dependencies:

   ```
   npm install
   ```

2. Start the backend server:

   ```
   npm start
   ```

   The server will start on `localhost:3001` by default.

3. Ensure your OCI CLI credentials and config file are present on the server (`~/.oci/config`).

## Logging

- Logs API requests/responses to both console (with pretty formatting if in development) and to file at `api.log`.
- Adjust log level by setting the `LOG_LEVEL` environment variable.

## Documentation

- Inline code is documented with comments and JSDoc blocks.
- See also the root `CONTRIBUTING.md` for development and contribution guidelines.