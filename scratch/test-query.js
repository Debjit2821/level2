const { rpc, Contract, TransactionBuilder, Account, Operation, Networks, scValToNative } = require("@stellar/stellar-sdk");

async function main() {
  const contractId = "CCLSPGZGNAPW7H7UPZETSVJ33XI3QYFRV2T2SJCQTK4655LEM3FFKZO7";
  const rpcUrl = "https://soroban-testnet.stellar.org";
  const server = new rpc.Server(rpcUrl);

  console.log("Connecting to Soroban RPC:", rpcUrl);
  console.log("Target Contract ID:", contractId);

  // Define a dummy source account for simulation
  const dummySource = new Account("GCNF6QIYA6N3RWEQVON7Q4ECM6G652SB7Z7ES4REDWADGJNEDW4WQJBD", "0");

  const tx = new TransactionBuilder(dummySource, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
  .addOperation(
    Operation.invokeContractFunction({
      contract: contractId,
      function: "get_total_invoices",
      args: []
    })
  )
  .setTimeout(30)
  .build();

  console.log("Simulating transaction...");
  const sim = await server.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationSuccess(sim)) {
    console.log("Simulation SUCCESS!");
    const retval = sim.result.retval;
    const count = scValToNative(retval);
    console.log("Total Invoices Count:", count.toString());
  } else {
    console.error("Simulation FAILED:", sim);
  }
}

main().catch(err => {
  console.error("Query failed:", err);
});
