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

export class CBEvent extends Event {
	private readonly timestamp: number;
	constructor(
		public type: EventTypes,
		public payload?: any,
	) {
		super(type);
		this.timestamp = Date.now();
	}
}
