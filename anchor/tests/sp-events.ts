import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { SpEvents } from "../target/types/sp_events";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  createInitializeMintInstruction,
  MintLayout,
  mintTo,
} from "@solana/spl-token";
import { createTransferInstruction } from "@solana/spl-token";
import { assert } from "chai";
import { Buffer } from "buffer";

describe("sp_events", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SpEvents as Program<SpEvents>;

  const authority = provider.wallet;
  let mint: Keypair;
  let payerTokenAccount: PublicKey;
  let vault: PublicKey;
  let vaultAuthority: PublicKey;
  let event: PublicKey;
  let playerList: PublicKey;
  let player: PublicKey;

  const eventId = new anchor.BN(1);
  const totalReward = new anchor.BN(1000);
  const startTs = new anchor.BN(Math.floor(Date.now() / 1000));
  const endTs = new anchor.BN(startTs.toNumber() + 3600);

  const mintA = new PublicKey("2PHq92eDkKEDRNZnzmXk7xWB1kmQJiyAhC986i6cvp1Y"); // Example mint address for DEV

  before(async () => {
    mint = anchor.web3.Keypair.generate();

    const lamports =
      await provider.connection.getMinimumBalanceForRentExemption(
        MintLayout.span
      );
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint.publicKey,
        0,
        authority.publicKey,
        null
      )
    );
    await provider.sendAndConfirm(tx, [mint]);

    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      mint.publicKey,
      authority.publicKey
    );
    payerTokenAccount = ata.address;

    await mintTo(
      provider.connection,
      authority.payer,
      mint.publicKey,
      payerTokenAccount,
      authority.publicKey,
      2000
    );
  });

  it("creates an event and vault", async () => {
    [event] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        authority.publicKey.toBuffer(),
        eventId.toArrayLike(Buffer, "le", 16),
      ],
      program.programId
    );
    [vaultAuthority] = await PublicKey.findProgramAddressSync(
      [Buffer.from("vault_authority"), event.toBuffer()],
      program.programId
    );
    [vault] = await PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), event.toBuffer()],
      program.programId
    );

    console.log("Event:", event.toBase58());
    await program.methods
      .createEvent(totalReward, startTs, endTs, eventId)
      .accounts({
        authority: authority.publicKey,
        eventAccount: event,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Event created");

    const evt = await program.account.eventAccount.fetch(event);
    assert.ok(evt.totalReward.eq(totalReward));
    assert.equal(evt.eventId.toString(), eventId.toString());
  });

  it("initializes vault PDA", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        authority: authority.publicKey,
        mint: mint.publicKey,
        vaultAuthority,
        vault,
        event,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const acc = await provider.connection.getAccountInfo(vault);
    assert.ok(acc !== null, "Vault account should exist");

    const tx = new anchor.web3.Transaction().add(
      createTransferInstruction(
        payerTokenAccount, // from
        vault, // to (vault PDA)
        authority.publicKey, // authority
        1000 // amount
      )
    );

    await provider.sendAndConfirm(tx, [authority.payer]);
  });

  it("registers and deposits for player", async () => {
    const userName = "alice";
    [player] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("player"),
        authority.publicKey.toBuffer(),
        eventId.toArrayLike(Buffer, "le", 16),
      ],
      program.programId
    );

    await program.methods
      .verifyPlayer(userName)
      .accounts({
        event,
        player,
        tokenAccount: payerTokenAccount,
        user: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const playerAcc = await program.account.player.fetch(player);
    assert.equal(playerAcc.userName, userName);
    assert.equal(playerAcc.score.toString(), "0");

    const depositAmount = new anchor.BN(500);
    await program.methods
      .depositToPlayer(depositAmount)
      .accounts({
        event,
        vault,
        vaultAuthority,
        recipientTokenAccount: playerAcc.tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const updated = await getAccount(
      provider.connection,
      playerAcc.tokenAccount
    );
    assert.ok(updated.amount >= BigInt(500));
  });
});
