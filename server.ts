
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handler);

    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log("Client connected", socket.id);

        socket.on("join-counter", (counterId) => {
            socket.join(`counter-${counterId}`);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected", socket.id);
        });
    });

    // Make io accessible globally or via some context if needed, 
    // or just rely on API routes emitting to a localized instance (which is hard in separate processes).
    // For this custom server, we can attach `io` to the global object or requests if we wrote custom middleware,
    // but simpler is to use a singleton pattern or just keep socket logic here for now.
    // Actually, for a simple app, we can emit events from our API routes by connecting to this socket server as a client? 
    // No, that's overengineering.
    // Better approach: We will use a global variable on `global` to store `io` so API routes can access it
    // if we were running in the same process. 
    // Since we are running `server.ts`, the API routes are inside the `app.prepare` context? 
    // No, they are handled by `handler`. They share the same process memory in this setup.

    (global as any).io = io;

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
