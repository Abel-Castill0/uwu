/* Genera el SHA-256 (hex) de una contraseña para ADMIN_HASH en config.js.
   Uso:
     node tools/generate-admin-hash.js "tu-contraseña"
     node tools/generate-admin-hash.js          # pide la contraseña sin mostrarla
   Pega el resultado en config.js → ADMIN_HASH. */
const crypto = require("crypto");
const readline = require("readline");

function sha256hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

const password = process.argv[2];
if (password !== undefined) {
  console.log(sha256hex(password));
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("Contraseña (no se mostrará): ", (value) => {
    rl.close();
    if (!value) { console.error("Contraseña vacía."); process.exit(1); }
    console.log("\nSHA-256:", sha256hex(value));
    console.log("Pégalo en config.js → ADMIN_HASH (64 caracteres hex).");
  });
}