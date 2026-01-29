/*
  backend/index.js

  Main entry point for the OCI Compartment and Policy Browser backend API.
  - Serves frontend via API endpoints.
  - Interfaces with OCI (Oracle Cloud Infrastructure) using the oci-sdk.
  - Handles logging, error handling, CORS, and transports requests securely.

  Endpoints:
    GET /api/profiles         List configured OCI CLI profiles
    GET /api/compartments     List sub-compartments given profile/parent compartment
    GET /api/policies         List IAM policies for a compartment and profile
*/

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const oci = require('oci-sdk');
const cors = require('cors');
const pino = require('pino');
const http = require('http'); // For OCI metadata service

// Logging configuration (console and file)
const logLevel = process.env.LOG_LEVEL || 'info';
const logger = pino({
  level: logLevel,
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty'
  } : undefined,
});

// Extra logger: always writes API logs at info+ to api.log
const apiFileLogger = pino(
  pino.destination({ dest: path.join(__dirname, 'api.log'), sync: false })
);

/** Backend launch argument: instance principal mode
 *  If "--instance-principal" is passed on CLI, use OCI instance principal auth and ignore local config/profiles.
 */
const INSTANCE_PRINCIPAL_MODE = process.argv.includes('--instance-principal');
const INSTANCE_PRINCIPAL_PROFILE_NAME = "instance-principal";

// Express app & constants
const app = express();
const PORT = process.env.PORT || 3001;

// OCI config file location (~/.oci/config)
const OCI_CONFIG_PATH = path.join(require('os').homedir(), '.oci', 'config');

// Middleware
app.use(cors());
app.use(bodyParser.json());

/**
 * API logging middleware
 * Logs incoming API requests and outgoing responses (truncated if large)
 * Both to console (summary/info & debug detail) and to api.log file
 */
app.use((req, res, next) => {
  const start = Date.now();
  const bodyData = req.method !== 'GET' ? req.body : undefined;

  // For shell: always log a minimal info line (at INFO+), full details only at DEBUG
  logger.info(`API request: ${req.method} ${req.originalUrl}`); // summary, always at INFO

  logger.debug({
    req: { method: req.method, url: req.originalUrl, body: bodyData }
  }, 'API request details'); // full only at DEBUG

  // For file: always log at info level
  apiFileLogger.info({
    req: { method: req.method, url: req.originalUrl, body: bodyData }
  }, 'API request start');

  // Patch res.json to capture the outgoing response
  const origJson = res.json;
  res.json = function (body) {
    const elapsed = Date.now() - start;
    // Summary for shell (INFO)
    logger.info(`API response: ${req.method} ${req.originalUrl} status=${res.statusCode}`);

    // Truncate large responses for logs
    logger.debug({
      req: { method: req.method, url: req.originalUrl, body: bodyData },
      res: {
        status: res.statusCode,
        body: Array.isArray(body) && body.length > 10
          ? `[Array(${body.length}) truncated to 10]{${JSON.stringify(body.slice(0, 10))}}`
          : body
      },
      elapsedMs: elapsed
    }, 'API response details');
    apiFileLogger.info({
      req: { method: req.method, url: req.originalUrl, body: bodyData },
      res: {
        status: res.statusCode,
        body: Array.isArray(body) && body.length > 10
          ? `[Array(${body.length}) truncated to 10]{${JSON.stringify(body.slice(0, 10))}}`
          : body
      },
      elapsedMs: elapsed
    }, 'API response');
    return origJson.call(this, body);
  };
  next();
});

/**
 * Utility: Parse OCI config profiles file (~/.oci/config)
 * Returns array of profile names
 */
function listOciProfiles(configPath = OCI_CONFIG_PATH) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const profiles = [];
    const profileRegex = /^\[([^\]]+)\]/gm;
    let match;
    while ((match = profileRegex.exec(content))) {
      profiles.push(match[1]);
    }
    return profiles;
  } catch (err) {
    // If cannot read, return empty (file may be missing)
    return [];
  }
}

/**
 * Utility: Load a specific OCI profile section from config file
 * Returns key-value object (profile fields) or null if missing/invalid
 */
function loadOciProfile(profileName, configPath = OCI_CONFIG_PATH) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let inProfile = false;
    const profileData = {};
    for (const line of lines) {
      const profileHeader = line.match(/^\[([^\]]+)\]/);
      if (profileHeader) {
        inProfile = profileHeader[1] === profileName;
        continue;
      }
      if (inProfile && line.trim() && !line.trim().startsWith('#')) {
        const idx = line.indexOf('=');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          profileData[key] = val;
        }
      }
    }
    return Object.keys(profileData).length > 0 ? profileData : null;
  } catch (err) {
    // Could not parse or file missing/bad
    return null;
  }
}

/**
 * GET /api/profiles
 * Returns: { profiles: [profileName, ...] }
 * Lists available OCI CLI config profiles on this server; or "instance-principal" if in IP mode
 */
app.get('/api/profiles', (req, res) => {
  try {
    if (INSTANCE_PRINCIPAL_MODE) {
      res.json({ profiles: [INSTANCE_PRINCIPAL_PROFILE_NAME] });
    } else {
      const profiles = listOciProfiles();
      res.json({ profiles });
    }
  } catch (err) {
    logger.error({ err }, 'Error in /api/profiles');
    res.status(500).json({ error: 'Failed to get profiles' });
  }
});

/**
 * GET /api/compartments?profile=PROFILE&parent=PARENT_ID
 * parent (optional): compartment OCID to list children for (root if omitted)
 *
 * Returns: array of compartment objects (from OCI IdentityClient)
 *
 * For given profile, loads credentials and returns sub-compartments for parent or tenancy root.
 */
app.get('/api/compartments', async (req, res) => {
  const { profile, parent } = req.query;
  if (INSTANCE_PRINCIPAL_MODE) {
    // Only accept magic profile name
    if (profile !== INSTANCE_PRINCIPAL_PROFILE_NAME) {
      logger.error({profile, parent}, 'In instance-principal mode, only accept "instance-principal" profile');
      return res.status(400).json({ error: "Profile must be 'instance-principal' in this mode" });
    }
    // Use instance principals provider and get tenancy OCID from metadata
    try {
      // Provider
      const provider = new oci.auth.InstancePrincipalsAuthenticationDetailsProvider();
      const identityClient = new oci.identity.IdentityClient({ authenticationDetailsProvider: provider });

      // Get tenancy OCID (first time: fetch and memoize)
      const tenancyId = await getInstanceTenancyOcid();
      if (!tenancyId) throw new Error("Unable to get tenancy OCID from instance metadata");

      const compartmentId = parent || tenancyId;

      const request = {
        compartmentId,
        accessLevel: "ANY",
        compartmentIdInSubtree: false
      };
      const response = await identityClient.listCompartments(request);
      res.json(response.items || []);
    } catch (err) {
      logger.error({ err, profile, parent }, 'Error in /api/compartments (instance-principal)');
      res.status(500).json({ error: err.message || "Failed to list compartments" });
    }
  } else {
    // Legacy: profile mode
    if (!profile) {
      logger.error({profile, parent}, 'Missing profile param in /api/compartments');
      return res.status(400).json({ error: "Missing profile" });
    }
    const profileConfig = loadOciProfile(profile);
    if (!profileConfig) {
      logger.error({profile, parent}, 'Profile not found in /api/compartments');
      return res.status(404).json({ error: "Profile not found" });
    }
    try {
      const provider = new oci.auth.ConfigFileAuthenticationDetailsProvider(
        OCI_CONFIG_PATH,
        profile
      );
      const identityClient = new oci.identity.IdentityClient({ authenticationDetailsProvider: provider });

      const compartmentId = parent || profileConfig.tenancy;

      const request = {
        compartmentId,
        accessLevel: "ANY",
        compartmentIdInSubtree: false
      };
      const response = await identityClient.listCompartments(request);
      res.json(response.items || []);
    } catch (err) {
      logger.error({ err, profile, parent }, 'Error in /api/compartments');
      res.status(500).json({ error: err.message || "Failed to list compartments" });
    }
  }
});

/**
 * GET /api/policies?profile=PROFILE&compartmentId=OCID
 * Returns: array of policy objects (from OCI IdentityClient)
 *
 * For given profile and compartment, loads credentials and gets all policies in that compartment.
 */
// GET /api/policies: List IAM policies for given profile/compartment; supports instance principal mode
app.get('/api/policies', async (req, res) => {
  const { profile, compartmentId } = req.query;
  if (INSTANCE_PRINCIPAL_MODE) {
    // Only accept magic profile name
    if (profile !== INSTANCE_PRINCIPAL_PROFILE_NAME) {
      logger.error({profile, compartmentId}, 'In instance-principal mode, only accept "instance-principal" profile');
      return res.status(400).json({ error: "Profile must be 'instance-principal' in this mode" });
    }
    if (!compartmentId) {
      logger.error({profile, compartmentId}, 'Missing compartmentId param in /api/policies');
      return res.status(400).json({ error: "Missing compartmentId" });
    }
    try {
      // Provider
      const provider = new oci.auth.InstancePrincipalsAuthenticationDetailsProvider();
      const identityClient = new oci.identity.IdentityClient({ authenticationDetailsProvider: provider });

      const request = {
        compartmentId
      };
      const response = await identityClient.listPolicies(request);
      res.json(response.items || []);
    } catch (err) {
      logger.error({ err, profile, compartmentId }, 'Error in /api/policies (instance-principal)');
      res.status(500).json({ error: err.message || "Failed to list policies" });
    }
  } else {
    // Legacy: profile mode
    if (!profile || !compartmentId) {
      logger.error({profile, compartmentId}, 'Missing params in /api/policies');
      return res.status(400).json({ error: "Missing profile or compartmentId" });
    }
    const profileConfig = loadOciProfile(profile);
    if (!profileConfig) {
      logger.error({profile, compartmentId}, 'Profile not found in /api/policies');
      return res.status(404).json({ error: "Profile not found" });
    }
    try {
      const provider = new oci.ConfigFileAuthenticationDetailsProvider(
        OCI_CONFIG_PATH,
        profile
      );
      const identityClient = new oci.identity.IdentityClient({ authenticationDetailsProvider: provider });

      const request = {
        compartmentId
      };
      const response = await identityClient.listPolicies(request);
      res.json(response.items || []);
    } catch (err) {
      logger.error({ err, profile, compartmentId }, 'Error in /api/policies');
      res.status(500).json({ error: err.message || "Failed to list policies" });
    }
  }
});

// Basic root route for backend connectivity test
app.get('/', (req, res) => {
  res.send('Hello from Express backend!');
});

/**
 * Global error handler for uncaught errors in routes/middleware
 */
app.use((err, req, res, next) => {
  logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled exception');
  res.status(500).json({ error: 'Internal Server Error' });
});

/**
 * Helper: Get tenancy OCID from instance metadata service (cached after first call)
 * Returns Promise<string|null>
 */
let _instanceMetaTenancyOcid = null;
function getInstanceTenancyOcid() {
  return new Promise((resolve) => {
    if (_instanceMetaTenancyOcid) return resolve(_instanceMetaTenancyOcid);
    // Fetch from OCI instance metadata (root info)
    http.get(
      "http://169.254.169.254/opc/v1/instance/",
      (resp) => {
        let data = "";
        resp.on("data", (chunk) => { data += chunk; });
        resp.on("end", () => {
          try {
            const meta = JSON.parse(data);
            if (typeof meta.compartmentId === "string" && meta.compartmentId.length) {
              _instanceMetaTenancyOcid = meta.compartmentId;
              resolve(_instanceMetaTenancyOcid);
            } else {
              resolve(null);
            }
          } catch (err) {
            resolve(null);
          }
        });
      }
    ).on("error", () => resolve(null));
  });
}

/**
 * Start Express server
 */
app.listen(PORT, () => {
  logger.info({ port: PORT, logLevel, nodeEnv: process.env.NODE_ENV, instancePrincipalMode: INSTANCE_PRINCIPAL_MODE }, `Server running at http://localhost:${PORT}/`);
  if (INSTANCE_PRINCIPAL_MODE) {
    logger.info("Backend running in INSTANCE PRINCIPAL mode: all OCI API calls use instance principal and expose only the 'instance-principal' profile.");
  }
});
