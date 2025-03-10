export type OutgoingMessage = {
    type: OutgoingMessageType,
    data: any
}

export enum OutgoingMessageType {
    RTPCAPABILITIES
}

export type IncomingMessage = {
    type: IncomingMessageType,
    data: any
}

export enum IncomingMessageType {
    RTPCAPABILITIES
}
