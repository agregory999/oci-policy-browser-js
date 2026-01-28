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
 * Lists available OCI CLI config profiles on this server
 */
app.get('/api/profiles', (req, res) => {
  try {
    const profiles = listOciProfiles();
    res.json({ profiles });
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
    const provider = new oci.ConfigFileAuthenticationDetailsProvider(
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
});

/**
 * GET /api/policies?profile=PROFILE&compartmentId=OCID
 * Returns: array of policy objects (from OCI IdentityClient)
 *
 * For given profile and compartment, loads credentials and gets all policies in that compartment.
 */
app.get('/api/policies', async (req, res) => {
  const { profile, compartmentId } = req.query;
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
 * Start Express server
 */
app.listen(PORT, () => {
  logger.info({ port: PORT, logLevel, nodeEnv: process.env.NODE_ENV }, `Server running at http://localhost:${PORT}/`);
});