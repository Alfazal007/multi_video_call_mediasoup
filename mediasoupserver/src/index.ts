import http from 'http'
import socketIo from 'socket.io';
import { isValidUser } from './helpers/isValidUser';

let server = http.createServer();

let io = new socketIo.Server(server);

io.on('connection', socket => {

    socket.on("establish-connection", async (data: {
        accessToken: string,
        room: string
    }) => {
        if (!data.accessToken || !data.room) {
            socket.emit("error-response", "Invalid data");
            socket.conn.close();
            return;
        }

        const isUserValid = await isValidUser(data.accessToken);
        if (!isUserValid) {
            socket.emit("error-response", "Invalid user");
            socket.conn.close();
            return;
        }
    });

    socket.on('disconnect', () => {
        console.log("disconnected");
    });
});

server.listen(3000, () => {
    console.log("server listening on port 3000");
});
