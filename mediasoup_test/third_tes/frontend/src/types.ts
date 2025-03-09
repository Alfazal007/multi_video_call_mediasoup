export enum OutgoingMessageType {
    GETRTPPARAMETERS
}

export enum IncomingMessageType {
    GETRTPPARAMETERS
}

export type IncomingMessage = {
    type: IncomingMessageType,
    data: any
}

export type OutgoingMessage = {
    type: OutgoingMessageType,
    data: any
}
