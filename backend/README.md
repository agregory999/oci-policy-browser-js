# OCI Compartment and Policy Browser Backend

This is the backend API for the OCI Compartment and Policy Browser.

## Overview

- Serves as the backend for browsing compartments and IAM policies in OCI.
- Interfaces with Oracle Cloud Infrastructure using the `oci-sdk`.
- Supports both classic OCI CLI profile authentication **and** OCI Instance Principal authentication (for production/OCI Compute deployments).
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

### Instance Principal Mode (OCI Compute: No API Keys/Profiles Needed)

To run the backend on an OCI compute instance using the instance principal for secure authentication (recommended for production):

```bash
npm start -- --instance-principal
```

- The backend will use the instance's dynamic credentials.  
- Only one profile is exposed: `"instance-principal"`. All `/api/compartments` and `/api/policies` calls must use `profile=instance-principal`.
- The root (tenancy) OCID is detected automatically via instance metadata service.
- **Must be run on an OCI Compute instance with required IAM permissions attached.**

If `--instance-principal` is NOT provided, the backend defaults to local profile mode (see below):

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
## Example API Requests

- In **instance principal mode**, always use:
  ```
  GET /api/profiles
  # returns: { "profiles": ["instance-principal"] }

  GET /api/compartments?profile=instance-principal
  # Optionally add &parent=ocid if not using tenancy root

  GET /api/policies?profile=instance-principal&compartmentId=ocid
  ```

- In **profile mode** (no flag), specify any configured profile name as before.

## Logging

- Logs API requests/responses to both console (with pretty formatting if in development) and to file at `api.log`.
- Adjust log level by setting the `LOG_LEVEL` environment variable.

## Documentation

- Inline code is documented with comments and JSDoc blocks.
- See also the root `CONTRIBUTING.md` for development and contribution guidelines.