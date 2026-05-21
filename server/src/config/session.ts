import session from "express-session";
import { RedisStore } from "connect-redis";
import { redisClient } from "./redis.js";

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not set");
}

const sessionSecret =
  process.env.SESSION_SECRET ?? "dev-session-secret-change-me";

export const sessionMiddleware = session({
  store: new RedisStore({
    client: redisClient,
    prefix: "singil:sess:",
    ttl: 60 * 60 * 24 * 7
  }),
  name: "sid",
  secret: sessionSecret,
  resave: false,
  rolling: true,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});
