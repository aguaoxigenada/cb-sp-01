import fs from "fs";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity,
  createSignerFromKeypair,
  publicKey as umiPk,
} from "@metaplex-foundation/umi";
import {
  createMetadataAccountV3,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";

/**
 * Usage:
 *   node scripts/create-metadata.mjs <MINT> "<NAME>" "<SYMBOL>" "<URI>"
 */
const [mintStr, name, symbol, uri] = process.argv.slice(2);
if (!mintStr || !name || !symbol || !uri) {
  console.error(
    'Usage: node scripts/create-metadata.mjs <MINT> "<NAME>" "<SYMBOL>" "<URI>"'
  );
  process.exit(1);
}

// 1) Umi on devnet
const umi = createUmi("https://api.devnet.solana.com");

// 2) Load your Solana CLI keypair (~/.config/solana/id.json)
const secret = JSON.parse(
  fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, "utf8")
);
const kp = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(secret));
const signer = createSignerFromKeypair(umi, kp);
umi.use(keypairIdentity(signer));

// 3) Derive PDA and create metadata
const mintUmi = umiPk(mintStr);
const [metadataPda] = findMetadataPda(umi, { mint: mintUmi });
console.log("Metadata PDA:", metadataPda.toString());

try {
  const tx = await createMetadataAccountV3(umi, {
    mint: mintUmi,
    mintAuthority: signer,
    payer: signer,
    updateAuthority: signer.publicKey,
    data: {
      name,
      symbol,
      uri, // your Irys/Arweave metadata_link
      sellerFeeBasisPoints: 0, // 0 for fungible game token
      creators: null,
      collection: null,
      uses: null,
    },
    isMutable: true,
    collectionDetails: null,
  }).sendAndConfirm(umi);

  console.log("✅ Metadata created. Tx signature:", tx.signature);
} catch (e) {
  const msg = String(e).toLowerCase();
  if (msg.includes("already in use") || msg.includes("already initialized")) {
    console.log("ℹ️ Metadata already exists for this mint.");
  } else {
    console.error("❌ Failed to create metadata:", e);
    process.exit(1);
  }
}
