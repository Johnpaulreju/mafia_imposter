import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { getSession } from "./lib/game-store.ts";
import { dispatchAction, getStateForSession } from "./lib/server-actions.ts";
import { publicSnapshot } from "./lib/safe-state.ts";
import { tickRoom } from "./lib/game-engine.ts";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();
await app.prepare();
const server = createServer(async (req,res)=>{
  if(req.url?.startsWith("/api/ws")) return;
  try { await handle(req,res); } catch(e){ res.statusCode=500; res.end("Internal error"); }
});
const wss = new WebSocketServer({ server, path: "/api/ws" });
const clients = new Map();
const broadcast = async (roomId,state)=>{ for(const ws of clients.get(roomId)||[]){ if(ws.readyState===1){ const s=await getSession(ws.sessionId); if(s) ws.send(JSON.stringify({type:"snapshot",data:publicSnapshot(state,ws.sessionId)})); } } };
wss.on("connection", async(ws,req)=>{
  const u=new URL(req.url,"http://localhost"); const sessionId=u.searchParams.get("sessionId"); const session=sessionId?await getSession(sessionId):null; if(!session){ws.close(1008,"Invalid session");return;}
  ws.sessionId=sessionId; ws.roomId=session.roomId; if(!clients.has(session.roomId)) clients.set(session.roomId,new Set()); clients.get(session.roomId).add(ws);
  const state=await getStateForSession(sessionId); if(state) ws.send(JSON.stringify({type:"snapshot",data:publicSnapshot(state,sessionId)}));
  ws.on("message",async raw=>{try{const msg=JSON.parse(raw.toString());if(msg.type!=="action")return;const nextState=await dispatchAction(sessionId,msg.action||{});if(nextState) await broadcast(session.roomId,nextState);}catch(e){ws.send(JSON.stringify({type:"error",message:e instanceof Error?e.message:"Action failed"}));}});
  ws.on("close",()=>clients.get(session.roomId)?.delete(ws));
});
setInterval(async()=>{ for(const [roomId] of clients){ const state=await tickRoom(roomId); if(state) await broadcast(roomId,state); } },250);
server.listen(port,()=>console.log(`Mafia Night running on http://localhost:${port}`));
