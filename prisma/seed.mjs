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

// Helper function to generate realistic part number with quantity
function generatePartWithQuantity() {
  // Generate 5-6 digit part number
  const partNumber = faker.number.int({ min: 10000, max: 999999 }).toString();

  // Generate quantity that's a multiple of 24 (between 24 and 240)
  const quantity = faker.number.int({ min: 1, max: 10 }) * 24;

  return { partNumber, quantity };
}

// Helper function to generate trailer number
function generateTrailerNumber() {
  const prefix = faker.helpers.arrayElement(["SL", "ST", "B"]);
  const number = faker.number.int({ min: 10000, max: 99999 });
  return `${prefix}${number}`;
}

// Helper function to generate realistic notes
function generateNote() {
  const noteTypes = [
    () =>
      `${faker.word.adjective()} delivery needed by ${faker.date
        .future()
        .toLocaleDateString()}`,
    () =>
      `Customer ${faker.person.lastName()} waiting at dock ${faker.number.int({
        min: 1,
        max: 50,
      })}`,
    () =>
      `Temperature sensitive - maintain at ${faker.number.int({
        min: 35,
        max: 75,
      })}°F`,
    () =>
      `Lift gate required for ${faker.number.int({ min: 1, max: 5 })} pallets`,
    () =>
      `Contact ${faker.person.fullName()} at ${faker.phone.number()} before delivery`,
    () => `Special handling required - ${faker.commerce.productMaterial()}`,
    () => `Priority level ${faker.number.int({ min: 1, max: 5 })} shipment`,
    () => `Dock ${faker.number.int({ min: 1, max: 50 })} assignment only`,
  ];

  return faker.helpers.arrayElement(noteTypes)();
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function clearDatabase() {
  console.log("Clearing database...");
  await prisma.requestLog.deleteMany();
  await prisma.partDetail.deleteMany();
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
    // Generate 1-3 parts with quantities
    const partCount = faker.number.int({ min: 1, max: 3 });
    const selectedParts = Array.from(
      { length: partCount },
      generatePartWithQuantity
    );

    // Calculate total pallet count based on quantities
    const totalPalletCount = selectedParts.reduce((acc, part) => {
      return acc + Math.ceil(part.quantity / 24); // 24 pieces per pallet
    }, 0);

    // Generate 1-3 random notes
    const noteCount = faker.number.int({ min: 1, max: 3 });
    const selectedNotes = Array.from({ length: noteCount }, generateNote).join(
      " | "
    );

    const request = await prisma.mustGoRequest.create({
      data: {
        shipmentNumber: faker.string.alphanumeric({
          length: 10,
          casing: "upper",
        }),
        plant: faker.helpers.arrayElement(["FV58", "PL45", "WH23", "DK89"]),
        trailerNumber: generateTrailerNumber(),
        palletCount: totalPalletCount,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        routeInfo: faker.location.streetAddress(),
        additionalNotes: selectedNotes,
        createdBy:
          createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
        partDetails: {
          create: selectedParts,
        },
      },
      include: {
        partDetails: true,
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
          action: faker.word.verb(),
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
