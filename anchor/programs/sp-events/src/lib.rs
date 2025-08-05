use anchor_lang::{prelude::*};
use anchor_spl::token::{
    self,
    Token,              // Token program
    TokenAccount,       // Token account
    Transfer as TokenTransfer  // Transfer instruction
};
declare_id!("37e2LZB4upG4gE9hmfc6YUxqtokBG7wbdYaBhqd3X4F1");

#[program]
pub mod sp_events {
    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        total_reward: u64,
        start_ts: i64,
        end_ts: i64,
        event_id: u8,
    ) -> Result<()> {
        let event_account = &mut ctx.accounts.event_account;
        event_account.authority = *ctx.accounts.authority.key;
        event_account.total_reward = total_reward;
        event_account.start_ts = start_ts;
        event_account.end_ts = end_ts;
        event_account.is_closed = false;
        event_account.event_id = event_id;

        let player_list = &mut ctx.accounts.player_list;
        player_list.event_key = ctx.accounts.event_account.key();
        player_list.event_id = event_id;
        player_list.players = Vec::new();

        Ok(())
    }

    pub fn verify_player(ctx: Context<VerifyPlayer>, user_name: String) -> Result<()> {
        // Prevent duplicate registration
        require!(
            ctx.accounts.player.user_name.is_empty(),
            CustomError::PlayerAlreadyRegistered
        );

        let game = &mut ctx.accounts.event;
        let player = &mut ctx.accounts.player;

        // Initialize player fields
        player.player_key = ctx.accounts.user.key();
        player.current_game_event = game.event_id;
        player.user_name = user_name.clone();
        player.score = 0;
        player.token_account = ctx.accounts.token_account.key();

        let player_list = &mut ctx.accounts.player_list;

        require!(
            !player_list.players.contains(&player.key()),
            CustomError::PlayerAlreadyJoined
        );

        player_list.players.push(player.key());

        emit!(PlayerJoined {
            player: player.player_key,
            total_players: player_list.players.len() as u64,
        });

        Ok(())
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
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
    pub event_id: u8,
}

impl EventAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Player {
    pub current_game_event: u8,
    pub user_name: String, // Anchor requires #[max_len] on strings from 0.30+
    pub score: i64,
    pub token_account: Pubkey,
    pub player_key: Pubkey,
}

#[account]
pub struct PlayerList {
    pub event_key: Pubkey,
    pub event_id: u8,
    pub players: Vec<Pubkey>,
}

#[derive(Accounts)]
#[instruction(total_reward: u64, start_ts: i64, end_ts: i64, event_id: u8)]
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

    #[account(
        init,
        seeds = [b"player_list", event_id.to_le_bytes().as_ref()],
        bump,
        payer = authority,
        space = 8 + 32 + 1 + (4 + 200 * 32) // room for 200 players
    )]
    pub player_list: Account<'info, PlayerList>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyPlayer<'info> {
    #[account(mut)]
    pub event: Account<'info, EventAccount>,

    #[account(
        mut,
        seeds = [b"player_list", event.event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub player_list: Account<'info, PlayerList>,

    #[account(
        init,
        payer = user,
        seeds = [b"player", user.key().as_ref(), event.event_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 1 + (4 + 32) + 8 + 32 + 32
    )]
    pub player: Account<'info, Player>,

    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct PlayerJoined {
    pub player: Pubkey,
    pub total_players: u64,
}

#[error_code]
pub enum CustomError {
    #[msg("Player already registered.")]
    PlayerAlreadyRegistered,
    #[msg("Player already joined the event.")]
    PlayerAlreadyJoined,
}
