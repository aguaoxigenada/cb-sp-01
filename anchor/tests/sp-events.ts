import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SpEvents } from "../target/types/sp_events";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  createInitializeMintInstruction,
  MintLayout,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";
import { Buffer } from "buffer";

describe("sp_events", () => {
  const provider = anchor.AnchorProvider.env(); // Esto deberia ser la local de momento.
  anchor.setProvider(provider);
  const program = anchor.workspace.SpEvents as Program<SpEvents>;

  const authority = provider.wallet;
  let mint: anchor.web3.Keypair;
  let payerTokenAccount: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let vaultAuthority: anchor.web3.PublicKey;
  let event: anchor.web3.PublicKey;
  let playerList: anchor.web3.PublicKey;
  let player: anchor.web3.PublicKey;

  const eventId = new anchor.BN(1);
  const totalReward = new anchor.BN(1000);
  const startTs = new anchor.BN(Math.floor(Date.now() / 1000));
  const endTs = new anchor.BN(startTs.toNumber() + 3600);

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
    [event] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("event"),
        authority.publicKey.toBuffer(),
        eventId.toArrayLike(Buffer, "le", 16),
      ],
      program.programId
    );
    [playerList] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("player_list"),
        eventId.toArrayLike(Buffer, "le", 16),
        event.toBuffer(),
      ],
      program.programId
    );
    [vaultAuthority] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault_authority"), event.toBuffer()],
      program.programId
    );
    [vault] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault"), event.toBuffer()],
      program.programId
    );

    await program.methods
      .createEvent(totalReward, startTs, endTs, eventId)
      .accounts({
        authority: authority.publicKey,
        eventAccount: event,
        playerList: playerList,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const evt = await program.account.eventAccount.fetch(event);
    assert.ok(evt.totalReward.eq(totalReward));
    assert.equal(evt.eventId.toString(), eventId.toString());

    const pl = await program.account.playerList.fetch(playerList);
    assert.equal(pl.players.length, 0);
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
  });

  it("registers and deposits for player", async () => {
    const userName = "alice";
    [player] = await anchor.web3.PublicKey.findProgramAddress(
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
        playerList,
        player,
        tokenAccount: payerTokenAccount,
        user: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const pl = await program.account.playerList.fetch(playerList);
    assert.equal(pl.players.length, 1);
    assert.deepEqual(pl.players[0].toBase58(), player.toBase58());

    const depositAmount = new anchor.BN(500);
    await program.methods
      .depositToPlayer(depositAmount)
      .accounts({
        event,
        vault,
        vaultAuthority,
        recipientTokenAccount: payerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const updated = await getAccount(provider.connection, payerTokenAccount);
    assert.ok(updated.amount.gte(new anchor.BN(2500))); // 2000 initial + 500 deposit
  });
});
