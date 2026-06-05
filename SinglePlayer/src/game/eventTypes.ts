export enum CBEventSource {
	EXTERNAL_MESSAGE = "received-external-message",
	PHASER_MESSAGE = "send-external-message",
}

export enum EventTypes {
	EVENT_AUTHENTICATE = "event-authenticate",
	EVENT_CHECK_BALANCE = "event-check-balance",
	EVENT_UNLOCK_GAME = "event-unlock-game",
	EVENT_GAME_OVER = "event-game-over",
	EVENT_RECEIVE_REWARD = "event-receive-reward",
	EVENT_CONNECT_WALLET = "event-connect-wallet",
}

// Payloads for messages the host page pushes into the game.
export interface AuthenticatePayload {
	isAuthenticated: boolean;
}

export interface UnlockGamePayload {
	isAllowedToPlay: boolean;
	baseFee?: number;
}

export interface ReceiveRewardPayload {
	reward: number;
}

// Discriminated union of every message the host can send in via window.phaserBridge.send().
// Switching on `type` narrows `payload` to the matching shape.
export type ExternalMessage =
	| { type: EventTypes.EVENT_AUTHENTICATE; payload: AuthenticatePayload }
	| { type: EventTypes.EVENT_UNLOCK_GAME; payload: UnlockGamePayload }
	| { type: EventTypes.EVENT_RECEIVE_REWARD; payload: ReceiveRewardPayload };
