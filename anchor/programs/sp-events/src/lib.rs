use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

declare_id!("37e2LZB4upG4gE9hmfc6YUxqtokBG7wbdYaBhqd3X4F1");

#[program]
pub mod sp_events {
    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        total_reward: u64,
        start_ts: i64,
        end_ts: i64,
        event_id: u128,
    ) -> Result<()> {
        let event_account = &mut ctx.accounts.event_account;
        event_account.authority = *ctx.accounts.authority.key;
        event_account.total_reward = total_reward;
        event_account.start_ts = start_ts;
        event_account.end_ts = end_ts;
        event_account.is_closed = false;
        event_account.event_id = event_id;

        Ok(())
    }

    pub fn verify_player(ctx: Context<VerifyPlayer>, user_name: String) -> Result<()> {
    let player = &mut ctx.accounts.player;

    require!(
        player.user_name.is_empty(),
        CustomError::PlayerAlreadyRegistered
    );

    player.player_key = ctx.accounts.user.key();
    player.current_game_event = ctx.accounts.event.event_id;
    player.user_name = user_name.clone();
    player.score = 0;
    player.token_account = ctx.accounts.token_account.key();

    emit!(PlayerJoined {
        player: player.player_key,
        event_id: player.current_game_event,
        user_name: player.user_name.clone(),
    });

        Ok(())
    }

    pub fn initialize_vault(_ctx: Context<InitializeVault>) -> Result<()> {
        Ok(())
    }

    pub fn deposit_to_player(
        ctx: Context<DepositToPlayer>,
        amount: u64,
    ) -> Result<()> {
        let binding = ctx.accounts.event.key();
        let seeds = &[b"vault_authority", binding.as_ref(), &[ctx.bumps.vault_authority]];
        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer,
        );

        anchor_spl::token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn submit_score(ctx: Context<SubmitScore>, score: i64) -> Result<()> {
        ctx.accounts.player.score = score;
        emit!(ScoreSubmitted {
            player: ctx.accounts.player.player_key,
            event_id: ctx.accounts.player.current_game_event,
            score: ctx.accounts.player.score,
        });
        Ok(())
    }


}

#[account]
pub struct EventAccount {
    pub authority: Pubkey,
    pub total_reward: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub is_closed: bool,
    pub event_id: u128, // Changed to u128 for larger event IDs
}

impl EventAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 1 + 16;}

#[account]
pub struct Player {
    pub current_game_event: u128,     // 16 bytes
    pub user_name: String,            // 4 + max length (e.g., 32)
    pub score: i64,                   // 8 bytes
    pub token_account: Pubkey,        // 32 bytes
    pub player_key: Pubkey,           // 32 bytes
}


#[derive(Accounts)]
#[instruction(total_reward: u64, start_ts: i64, end_ts: i64, event_id: u128)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        seeds = [b"event", authority.key().as_ref(), event_id.to_le_bytes().as_ref()],
        bump,
        payer = authority,
        space = 8 + EventAccount::LEN
    )]
    pub event_account: Account<'info, EventAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyPlayer<'info> {
    #[account(mut)]
    pub event: Account<'info, EventAccount>,

    #[account(
        init,
        payer = user,
        seeds = [b"player", user.key().as_ref(), event.event_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 16 + (4 + 32) + 8 + 32 + 32 // event_id + user_name + score + keys
    )]
    pub player: Account<'info, Player>,

    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [b"vault_authority", event.key().as_ref()],
        bump
    )]
    /// CHECK: This PDA is only used for signing. No data is stored here.
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"vault", event.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub event: Account<'info, EventAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositToPlayer<'info> {
    #[account(mut)]
    pub event: Account<'info, EventAccount>,
    #[account(
        mut,
        seeds = [b"vault", event.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"vault_authority", event.key().as_ref()],
        bump
    )]
    /// CHECK: This PDA is only used for signing. No data is stored here.
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(_event_id: u128)]
pub struct SubmitScore<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"player", player.player_key.key().as_ref(), _event_id.to_le_bytes().as_ref()], bump)]
    pub player: Account<'info, Player>,
}

#[event]
pub struct PlayerJoined {
    pub player: Pubkey,
    pub event_id: u128,
    pub user_name: String,
}

#[event]
pub struct ScoreSubmitted {
    pub player: Pubkey,
    pub event_id: u128,
    pub score: i64,
}

#[error_code]
pub enum CustomError {
    #[msg("Player already registered.")]
    PlayerAlreadyRegistered,
    #[msg("Player already joined the event.")]
    PlayerAlreadyJoined,
}
