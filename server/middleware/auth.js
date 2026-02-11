import { upsertUser } from "../db/users.js";
import { appUser } from "../db/schema.js";

const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return decoded;
  } catch {
    return null;
  }
};

export const authMiddleware = async (req, res, next) => {
  // Allow CORS preflight to pass through without auth; real requests will carry the token.
  
  if (req.method === "OPTIONS") return next();
  if (req.path === "/") return next(); // health

  const authHeader = req.headers.authorization;
  console.log("Auth header:", authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }
  const token = authHeader.replace("Bearer ", "").trim();
  const payload = decodeJwt(token);

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
    return res.status(401).json({ message: "Invalid token: missing user id" });
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
