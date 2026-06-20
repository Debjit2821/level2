try {
  const freighter = require("@creit.tech/stellar-wallets-kit/modules/freighter");
  console.log("Freighter Module:", Object.keys(freighter));
} catch (e) {
  console.log("Freighter error:", e.message);
}

try {
  const albedo = require("@creit.tech/stellar-wallets-kit/modules/albedo");
  console.log("Albedo Module:", Object.keys(albedo));
} catch (e) {
  console.log("Albedo error:", e.message);
}

try {
  const xbull = require("@creit.tech/stellar-wallets-kit/modules/xbull");
  console.log("xBull Module:", Object.keys(xbull));
} catch (e) {
  console.log("xBull error:", e.message);
}

try {
  const utils = require("@creit.tech/stellar-wallets-kit/modules/utils");
  console.log("Utils Module:", Object.keys(utils));
} catch (e) {
  console.log("Utils error:", e.message);
}
