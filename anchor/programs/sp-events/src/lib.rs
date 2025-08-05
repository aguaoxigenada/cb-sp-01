use anchor_lang::prelude::*;

declare_id!("37e2LZB4upG4gE9hmfc6YUxqtokBG7wbdYaBhqd3X4F1");

#[program]
pub mod sp_events {
    use super::*;

   pub fn create_event(
        ctx: Context<CreateEvent>,
        total_reward: u64,
        start_ts: i64,
        end_ts: i64,
    ) -> Result<()> {
        let event_account = &mut ctx.accounts.event_account;
        event_account.authority = *ctx.accounts.authority.key;
        event_account.total_reward = total_reward;
        event_account.start_ts = start_ts;
        event_account.end_ts = end_ts;
        event_account.is_closed = false;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(total_reward: u64, start_ts: i64, end_ts: i64)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        seeds = [b"event", authority.key().as_ref(), start_ts.to_le_bytes().as_ref()],
        bump,
        payer = authority,
        space = 8 + EventAccount::LEN
    )]
    pub event_account: Account<'info, EventAccount>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct EventAccount {
    pub authority: Pubkey,
    pub total_reward: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub is_closed: bool,
}

impl EventAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 1; // Pubkey + u64 + i64 + i64 + bool
}
