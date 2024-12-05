import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option("clear", {
    type: "boolean",
    description: "Clear all existing data before seeding",
    default: false,
  })
  .option("use-faker", {
    type: "boolean",
    description: "Use faker to generate realistic data",
    default: false,
  })
  .option("count", {
    type: "number",
    description: "Number of records to generate",
    default: 5,
  })
  .parse();

const roles = [
  "ADMIN",
  "CUSTOMER_SERVICE",
  "WAREHOUSE",
  "REPORT_RUNNER",
  "PENDING",
];
const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const rolePasswords = {
  ADMIN: "adminpass",
  CUSTOMER_SERVICE: "cspass",
  WAREHOUSE: "whpass",
  REPORT_RUNNER: "rrpass",
  PENDING: "pendingpass",
};

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function clearDatabase() {
  console.log("Clearing database...");
  await prisma.requestLog.deleteMany();
  await prisma.mustGoRequest.deleteMany();
  await prisma.user.deleteMany();
  console.log("Database cleared");
}

async function generateBasicData(count, useFaker) {
  // Create default bob user
  const bobUser = {
    name: "Bob",
    email: "bob@bob.bob",
    password: await hashPassword("adminpass"),
    role: "ADMIN",
  };

  const users = await Promise.all(
    Array.from({ length: count }, async () => {
      const role = roles[Math.floor(Math.random() * roles.length)];
      return {
        name: useFaker
          ? faker.person.fullName()
          : `User ${faker.number.int(999)}`,
        email: useFaker
          ? faker.internet.email()
          : `user${faker.number.int(999)}@example.com`,
        password: await hashPassword(rolePasswords[role]),
        role,
      };
    })
  );

  return { users: [bobUser, ...users] };
}

async function main() {
  console.log("Starting seed...");

  if (argv.clear) {
    await clearDatabase();
  }

  const { users } = await generateBasicData(argv.count, argv.useFaker);

  // Create users
  const createdUsers = await Promise.all(
    users.map((user) => prisma.user.create({ data: user }))
  );
  console.log(
    `Created ${createdUsers.length} users (including default bob@bob.bob)`
  );

  // Create must-go requests
  const requests = [];
  for (let i = 0; i < argv.count; i++) {
    // Generate 1-3 part numbers for each request
    const partNumberCount = faker.number.int({ min: 1, max: 3 });
    const partNumbers = Array.from({ length: partNumberCount }, () =>
      argv.useFaker
        ? faker.string.alphanumeric({ length: 8, casing: "upper" })
        : `PART-${faker.number.int(999)}`
    );

    const request = await prisma.mustGoRequest.create({
      data: {
        shipmentNumber: argv.useFaker
          ? faker.string.alphanumeric({ length: 10, casing: "upper" })
          : `SHIP-${faker.number.int(999)}`,
        partNumbers,
        palletCount: faker.number.int({ min: 1, max: 10 }),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        routeInfo: argv.useFaker
          ? faker.location.streetAddress()
          : `Route ${faker.number.int(999)}`,
        additionalNotes: argv.useFaker
          ? faker.lorem.sentence()
          : `Note ${faker.number.int(999)}`,
        createdBy:
          createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
      },
    });
    requests.push(request);
  }
  console.log(`Created ${requests.length} must-go requests`);

  // Create request logs
  const logs = [];
  for (const request of requests) {
    const logCount = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < logCount; i++) {
      const log = await prisma.requestLog.create({
        data: {
          mustGoRequestId: request.id,
          action: argv.useFaker
            ? faker.word.verb()
            : `Action ${faker.number.int(999)}`,
          performedBy:
            createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
        },
      });
      logs.push(log);
    }
  }
  console.log(`Created ${logs.length} request logs`);

  console.log("Seed completed successfully");
  console.log("\nDefault user created:");
  console.log("Email: bob@bob.bob");
  console.log("Password: adminpass");
  console.log("\nRole-specific passwords:");
  Object.entries(rolePasswords).forEach(([role, pass]) => {
    console.log(`${role}: ${pass}`);
  });
}

main()
  .catch((error) => {
    console.error("Error during seeding:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
