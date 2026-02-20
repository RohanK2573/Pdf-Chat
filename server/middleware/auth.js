import crypto from "crypto";
import { env } from "../config/env.js";
import { upsertUser } from "../db/users.js";

const CLERK_JWKS_URL = `${env.clerkJwtIssuer}/.well-known/jwks.json`;
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

let jwksCache = {
  expiresAt: 0,
  keys: [],
};

const decodeBase64UrlJson = (value) => {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const decodeJwtUnverified = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeBase64UrlJson(parts[0]);
  const payload = decodeBase64UrlJson(parts[1]);
  if (!header || !payload) return null;
  return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature: parts[2] };
};

const getJwks = async () => {
  const now = Date.now();
  if (jwksCache.expiresAt > now && jwksCache.keys.length > 0) {
    return jwksCache.keys;
  }
  const response = await fetch(CLERK_JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Clerk JWKS (${response.status})`);
  }
  const data = await response.json();
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  if (keys.length === 0) {
    throw new Error("Clerk JWKS does not contain any signing keys");
  }
  jwksCache = {
    keys,
    expiresAt: now + JWKS_CACHE_TTL_MS,
  };
  return keys;
};

const verifyRs256 = (tokenDetails, jwk) => {
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(tokenDetails.signingInput);
  verifier.end();
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  return verifier.verify(publicKey, Buffer.from(tokenDetails.signature, "base64url"));
};

const validateTimeClaims = (payload) => {
  const now = Math.floor(Date.now() / 1000);
  if (payload?.exp && now >= payload.exp) {
    throw new Error("Token expired");
  }
  if (payload?.nbf && now < payload.nbf) {
    throw new Error("Token not active yet");
  }
};

const validateIdentityClaims = (payload) => {
  if (payload?.iss !== env.clerkJwtIssuer) {
    throw new Error("Invalid token issuer");
  }
  if (env.clerkAudience) {
    const aud = payload?.aud;
    const allowed = Array.isArray(aud) ? aud : [aud];
    if (!allowed.includes(env.clerkAudience)) {
      throw new Error("Invalid token audience");
    }
  }
  if (env.clerkAuthorizedParty && payload?.azp !== env.clerkAuthorizedParty) {
    throw new Error("Invalid token authorized party");
  }
};

const verifyClerkToken = async (token) => {
  const decoded = decodeJwtUnverified(token);
  if (!decoded) throw new Error("Malformed token");
  if (decoded.header?.alg !== "RS256") {
    throw new Error("Unsupported token algorithm");
  }
  const keys = await getJwks();
  const key = keys.find((k) => k.kid === decoded.header?.kid);
  if (!key) {
    jwksCache.expiresAt = 0;
    const refreshedKeys = await getJwks();
    const refreshedKey = refreshedKeys.find((k) => k.kid === decoded.header?.kid);
    if (!refreshedKey) throw new Error("No matching Clerk signing key found");
    if (!verifyRs256(decoded, refreshedKey)) {
      throw new Error("Invalid token signature");
    }
  } else if (!verifyRs256(decoded, key)) {
    throw new Error("Invalid token signature");
  }
  validateTimeClaims(decoded.payload);
  validateIdentityClaims(decoded.payload);
  return decoded.payload;
};

export const authMiddleware = async (req, res, next) => {
  // Allow CORS preflight to pass through without auth; real requests will carry the token.
  if (req.method === "OPTIONS") return next();
  if (req.path === "/") return next(); // health

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }
  const token = authHeader.slice("Bearer ".length).trim();

  let payload;
  try {
    payload = await verifyClerkToken(token);
  } catch (err) {
    console.error("Token verification failed", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const externalId =
    payload?.sub || payload?.user_id || payload?.userId || payload?.sid;
  const email =
    payload?.email ||
    payload?.email_address ||
    payload?.primary_email ||
    payload?.["email_addresses"]?.[0]?.email_address;
  const name =
    payload?.name ||
    [payload?.first_name, payload?.last_name].filter(Boolean).join(" ").trim();

  if (!externalId) {
    return res.status(401).json({ message: "Invalid token: missing subject" });
  }

  try {
    const user = await upsertUser({ externalId, email, name });
    req.user = {
      id: user.id,
      externalId,
      email,
      name,
    };
    return next();
  } catch (err) {
    console.error("Auth upsert failed", err);
    return res.status(500).json({ message: "Failed to upsert user" });
  }
};
