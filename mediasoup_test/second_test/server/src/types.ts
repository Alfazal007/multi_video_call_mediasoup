export enum MessageType {
    getRouterRtpCapabilities,
    createTransport,
    connectProducerTransport,
    transportproduce,
    connectConsumerTransport,
    consumeMedia,
    resumePausedConsumer
}

export type Message = {
    type: MessageType,
    data: Record<string, string>
}
