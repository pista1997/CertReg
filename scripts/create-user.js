// Skript na vytvorenie prvého používateľa
// Spustite: node scripts/create-user.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createUser() {
  try {
    console.log("\n=== Vytvorenie nového používateľa ===\n");

    const username = await question("Používateľské meno: ");
    const password = await question("Heslo (min. 6 znakov): ");

    if (!username || !password) {
      console.error("Chyba: Používateľské meno a heslo sú povinné");
      process.exit(1);
    }

    if (password.length < 6) {
      console.error("Chyba: Heslo musí mať aspoň 6 znakov");
      process.exit(1);
    }

    // Kontrola či používateľ už existuje
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      console.error(`Chyba: Používateľ "${username}" už existuje`);
      process.exit(1);
    }

    // Hash hesla
    const hashedPassword = await bcrypt.hash(password, 10);

    // Vytvorenie používateľa
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    console.log(`\n✅ Používateľ "${user.username}" bol úspešne vytvorený!\n`);
    console.log("Teraz sa môžete prihlásiť na: http://localhost:3000/login\n");
  } catch (error) {
    console.error("Chyba:", error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createUser();
