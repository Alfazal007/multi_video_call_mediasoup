export enum IncomingMessageType {
    GETRTPPARAMETERS
}

export enum OutgoingMessageType {
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
