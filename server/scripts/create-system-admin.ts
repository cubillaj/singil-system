import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../src/db/db.js";
import { users } from "../src/db/schema.js";

const saltRounds = 12;

function getArg(name: string) {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));

  return arg?.slice(name.length + 3);
}

const email = getArg("email") ?? process.env.SYSTEM_ADMIN_EMAIL;
const password = getArg("password") ?? process.env.SYSTEM_ADMIN_PASSWORD;
const name = getArg("name") ?? process.env.SYSTEM_ADMIN_NAME ?? "System";
const lastName = getArg("lastName") ?? process.env.SYSTEM_ADMIN_LAST_NAME ?? "Admin";

if (!email || !password) {
  console.error(
    "Usage: npm run create:system-admin -- --email=admin@example.com --password=your-password --name=System --lastName=Admin"
  );
  process.exit(1);
}

if (password.length < 8 || password.length > 72) {
  console.error("Password must be between 8 and 72 characters.");
  process.exit(1);
}

const normalizedEmail = email.toLowerCase();

const existingUser = await db.query.users.findFirst({
  where: eq(users.email, normalizedEmail),
});

if (existingUser) {
  console.error(`User already exists for email: ${normalizedEmail}`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, saltRounds);

const [createdUser] = await db.insert(users).values({
  organizationId: null,
  name,
  lastName,
  email: normalizedEmail,
  passwordHash,
  role: "system_admin",
  emailVerified: true,
  emailVerifiedAt: new Date(),
}).returning({
  id: users.id,
  email: users.email,
  role: users.role,
});

console.log("System admin created:");
console.log(createdUser);

process.exit(0);
