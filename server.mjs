import { createServer } from "node:http";
import next from "next";
import { GameRealtimeService } from "./server/app.ts";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();
await app.prepare();
const game = new GameRealtimeService();
const server = createServer(async (req,res)=>{
  try {
    if (await game.handleHttp(req, res)) return;
    await handle(req,res);
  } catch(e){
    console.error(e);
    res.statusCode=500;
    res.end("Internal error");
  }
});

game.attach(server, (req, socket, head) => {
  if (req.url?.startsWith("/_next/")) {
    app.getUpgradeHandler()(req, socket, head);
    return;
  }
  socket.destroy();
});
server.listen(port,()=>console.log(`Mafia Night running on http://localhost:${port}`));
