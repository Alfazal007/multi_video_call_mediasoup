export enum OutgoingMessageType {
    GETRTPPARAMETERS,
    CREATETRANSPORT,
    TRANSPORTCONNECT,
    TRANSPORTPRODUCE,
    GETPRODUCERS
}

export enum IncomingMessageType {
    GETRTPPARAMETERS,
    CREATETRANSPORT,
    TRANSPORTPRODUCE,
    GETPRODUCERS
}

export type IncomingMessage = {
    type: IncomingMessageType,
    data: any
}

export type OutgoingMessage = {
    type: OutgoingMessageType,
    data: any
}
