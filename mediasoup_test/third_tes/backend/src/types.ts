import { types as mediaSoupTypes } from "mediasoup";
import { WebSocket } from "ws";

export enum IncomingMessageType {
    GETRTPPARAMETERS,
    CREATETRANSPORT
}

export enum OutgoingMessageType {
    GETRTPPARAMETERS,
    CREATETRANSPORT
}

export type IncomingMessage = {
    type: IncomingMessageType,
    data: any
}

export type OutgoingMessage = {
    type: OutgoingMessageType,
    data: any
}

export type TransportTypeCustom = {
    ws: WebSocket,
    transport: mediaSoupTypes.WebRtcTransport,
    isConsumer: boolean
}
