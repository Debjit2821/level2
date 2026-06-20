try {
  const modules = require("@creit.tech/stellar-wallets-kit");
  console.log("Modules Keys:", Object.keys(modules));
} catch (e) {
  console.log("Error:", e.message);
}
