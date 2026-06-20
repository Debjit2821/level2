const { Horizon } = require("@stellar/stellar-sdk");

console.log("Horizon:", typeof Horizon);
if (Horizon) {
  console.log("Horizon.Server:", typeof Horizon.Server);
}
