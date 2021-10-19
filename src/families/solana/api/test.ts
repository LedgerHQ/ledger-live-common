import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  ConfirmedSignatureInfo,
  ConfirmedTransaction,
  ParsedConfirmedTransaction,
  ParsedMessage,
} from "@solana/web3.js";

//const conn = new Connection(clusterApiUrl("devnet"), 'confirmed');
const conn = new Connection("http://api.devnet.solana.com/", "confirmed");

async function go() {
  const key = new PublicKey("3tgkMfug2gs82sy2wexQjMkR12JzFcX9rSLd9yM9m38g");

  const ix = SystemProgram.transfer({
    fromPubkey: key,
    toPubkey: key,
    lamports: 50000,
  });

  const acc = await conn.getAccountInfo(key);
  console.log(acc);

  const info = await conn.getSignaturesForAddress(key);
  console.log(info);
}

go();
