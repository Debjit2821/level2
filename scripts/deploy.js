const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run() {
  console.log("🚀 Starting contract deployment to Stellar Testnet...");

  // 1. Path definitions
  const projectRoot = path.resolve(__dirname, "..");
  const wasmPath = path.join(
    projectRoot,
    "contracts",
    "payment_manager",
    "target",
    "wasm32v1-none",
    "release",
    "payment_manager.wasm"
  );

  if (!fs.existsSync(wasmPath)) {
    console.error(`❌ WASM binary not found at ${wasmPath}. Please run cargo build/stellar build first.`);
    process.exit(1);
  }

  // Define PATH to include winget's Node, cargo, and Stellar CLI
  const customPath = [
    "C:\\MinGW\\bin",
    "C:\\Users\\debji\\.cargo\\bin",
    "C:\\Users\\debji\\AppData\\Local\\Microsoft\\WinGet\\Packages\\OpenJS.NodeJS_Microsoft.Winget.Source_8wekyb3d8bbwe\\node-v26.3.1-win-x64",
    "C:\\Program Files (x86)\\Stellar CLI",
    process.env.PATH
  ].join(";");

  const execOptions = {
    cwd: projectRoot,
    env: { ...process.env, PATH: customPath },
    encoding: "utf8"
  };

  // 2. Generate key/identity for deployment
  console.log("🔑 Generating deployer keypair on Stellar Testnet...");
  try {
    // Generate identity "deployer" on testnet
    // First check if it exists by listing
    let exists = false;
    try {
      const keysList = execSync("stellar keys ls", execOptions);
      if (keysList.includes("deployer")) {
        exists = true;
      }
    } catch (e) {
      // Ignore list error
    }

    if (exists) {
      console.log("ℹ️ Identity 'deployer' already exists. Reusing it.");
    } else {
      console.log("Creating new identity 'deployer'...");
      execSync("stellar keys generate deployer --network testnet", execOptions);
      console.log("✅ Deployer identity created.");
    }

    console.log("Funding deployer identity via Friendbot...");
    execSync("stellar keys fund deployer --network testnet", execOptions);
    console.log("✅ Deployer identity funded.");
  } catch (error) {
    console.error("❌ Failed to setup keypair:", error);
    process.exit(1);
  }

  // 3. Deploy the WASM contract
  console.log("📦 Deploying WASM contract to Stellar Testnet (this may take a moment)...");
  let contractId = "";
  try {
    const deployCmd = `stellar contract deploy --wasm "${wasmPath}" --source deployer --network testnet`;
    console.log(`Executing: ${deployCmd}`);
    const output = execSync(deployCmd, execOptions);
    console.log("Output from deploy command:\n", output);
    
    // The contract ID is a 56 character string starting with C. Let's find it.
    const match = output.trim().match(/C[A-Z0-9]{55}/);
    if (match) {
      contractId = match[0];
    } else {
      // Fallback: search for any 56-character string in output
      const lines = output.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 56 && trimmed.startsWith("C")) {
          contractId = trimmed;
          break;
        }
      }
    }
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }

  if (!contractId) {
    console.error("❌ Failed to extract contract ID from command output.");
    process.exit(1);
  }

  console.log(`\n🎉 Contract successfully deployed!`);
  console.log(`🔑 Contract ID: ${contractId}`);

  // 4. Update configuration files
  // Write to .env.local
  const envPath = path.join(projectRoot, ".env.local");
  const envContent = `NEXT_PUBLIC_CONTRACT_ID=${contractId}
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
`;
  fs.writeFileSync(envPath, envContent, "utf8");
  console.log(`📝 Wrote environment variables to ${envPath}`);

  // Write to lib/config.json
  const libDir = path.join(projectRoot, "lib");
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }
  const configPath = path.join(libDir, "config.json");
  const configContent = JSON.stringify({
    contractId,
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test Stellar Public Network ; September 2015" // Soroban Testnet network passphrase is "Test Stellar Public Network ; September 2015"
  }, null, 2);
  fs.writeFileSync(configPath, configContent, "utf8");
  console.log(`📝 Wrote JSON config to ${configPath}`);

  console.log("\n✅ Deployment script complete! Your DApp is now configured.");
}

run();
