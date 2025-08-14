import fs from "fs";
import {
  createUmi,
  publicKey as umiPk,
} from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity,
  createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import {
  fetchMetadataFromSeeds,
  updateV1,
} from "@metaplex-foundation/mpl-token-metadata";
import { base58 } from "@metaplex-foundation/umi/serializers";

/**
 * Usage (any combination of fields is optional; only provided ones are updated):
 *   node scripts/update-metadata.mjs <MINT> [--name "New Name"] [--symbol "NEW"] [--uri "https://..."]
 *
 * Examples:
 *   node scripts/update-metadata.mjs E7y2... --uri "https://gateway.irys.xyz/NEW_URI_ID"
 *   node scripts/update-metadata.mjs E7y2... --name "Crypto Beasts v2" --symbol "CBX"
 */

function parseArgs(argv) {
  const out = {
    mint: null,
    name: undefined,
    symbol: undefined,
    uri: undefined,
  };
  const [mint, ...rest] = argv.slice(2);
  if (!mint) {
    console.error(
      'Usage: node scripts/update-metadata.mjs <MINT> [--name "New Name"] [--symbol "NEW"] [--uri "https://..."]'
    );
    process.exit(1);
  }
  out.mint = mint;
  for (let i = 0; i < rest.length; i++) {
    const k = rest[i];
    const v = rest[i + 1];
    if (k === "--name") (out.name = v), i++;
    else if (k === "--symbol") (out.symbol = v), i++;
    else if (k === "--uri") (out.uri = v), i++;
  }
  if (
    out.name === undefined &&
    out.symbol === undefined &&
    out.uri === undefined
  ) {
    console.error(
      "Nothing to update. Provide at least one of --name, --symbol, --uri."
    );
    process.exit(1);
  }
  return out;
}

async function main() {
  const { mint, name, symbol, uri } = parseArgs(process.argv);

  // 1) Umi on devnet
  const umi = createUmi("https://api.devnet.solana.com");

  // 2) Load your Solana CLI keypair (~/.config/solana/id.json)
  const secret = JSON.parse(
    fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, "utf8")
  );
  const kp = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(secret));
  const signer = createSignerFromKeypair(umi, kp);
  umi.use(keypairIdentity(signer));

  const mintUmi = umiPk(mint);

  // 3) Fetch current on-chain metadata so we can preserve fields you didn't change
  const currentMd = await fetchMetadataFromSeeds(umi, { mint: mintUmi });
  const nextData = {
    name: name ?? currentMd.data.name,
    symbol: symbol ?? currentMd.data.symbol,
    uri: uri ?? currentMd.data.uri,
    sellerFeeBasisPoints: currentMd.data.sellerFeeBasisPoints,
    creators: currentMd.data.creators,
  };

  // 4) Send Update (requires you are the update authority and isMutable = true)
  const res = await updateV1(umi, {
    mint: mintUmi,
    authority: signer,
    data: nextData,
    // you can also change isMutable / primarySaleHappened here if desired
  }).sendAndConfirm(umi);

  console.log("Metadata updated. Tx signature:", base58.encode(res.signature));
  console.log("New values:", nextData);
}

main().catch((e) => {
  console.error("Update failed:", e);
  process.exit(1);
});
