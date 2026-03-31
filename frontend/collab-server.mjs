/**
 * Yjs WebSocket 协作服务器
 *
 * 负责多人实时协同编辑的文档同步。
 * 基于 y-protocols(sync + awareness) 实现。
 * 每篇文章对应一个房间（room = "post-<id>" 或 "new-<uuid>"）。
 *
 * 启动: node collab-server.mjs
 * 默认端口: 4444（可通过 COLLAB_PORT 环境变量覆盖）
 */

import http from "node:http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const PORT = Number(process.env.COLLAB_PORT ?? 4444);
const HOST = process.env.COLLAB_HOST ?? "0.0.0.0";

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

/** @type {Map<string, { doc: Y.Doc, awareness: awarenessProtocol.Awareness, conns: Map<import("ws").WebSocket, Set<number>> }>} */
const rooms = new Map();

function getOrCreateRoom(roomName) {
  let room = rooms.get(roomName);
  if (room) return room;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null); // server has no state

  room = { doc, awareness, conns: new Map() };

  awareness.on("update", (/** @type {{ added: number[], updated: number[], removed: number[] }} */ changes, origin) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, [...changes.added, ...changes.updated, ...changes.removed]),
    );
    const msg = encoding.toUint8Array(encoder);

    room.conns.forEach((_ids, conn) => {
      if (conn.readyState === 1) conn.send(msg);
    });
  });

  doc.on("update", (update, origin) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const msg = encoding.toUint8Array(encoder);

    room.conns.forEach((_ids, conn) => {
      if (conn !== origin && conn.readyState === 1) conn.send(msg);
    });
  });

  rooms.set(roomName, room);
  return room;
}

function handleConnection(ws, roomName) {
  const room = getOrCreateRoom(roomName);
  const { doc, awareness, conns } = room;

  const controlledIds = new Set();
  conns.set(ws, controlledIds);

  // Send sync step 1
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  // Send current awareness
  {
    const states = awareness.getStates();
    if (states.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(states.keys())),
      );
      ws.send(encoding.toUint8Array(encoder));
    }
  }

  ws.on("message", (data) => {
    try {
      const msg = new Uint8Array(data);
      const decoder = decoding.createDecoder(msg);
      const msgType = decoding.readVarUint(decoder);

      if (msgType === MSG_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
        const reply = encoding.toUint8Array(encoder);
        // If there's data to send back (sync step 2), send it
        if (encoding.length(encoder) > 1) {
          ws.send(reply);
        }
      } else if (msgType === MSG_AWARENESS) {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  ws.on("close", () => {
    conns.delete(ws);
    awarenessProtocol.removeAwarenessStates(awareness, Array.from(controlledIds), null);

    // Clean up empty rooms after a delay
    if (conns.size === 0) {
      setTimeout(() => {
        if (conns.size === 0) {
          awareness.destroy();
          doc.destroy();
          rooms.delete(roomName);
        }
      }, 30_000);
    }
  });
}

const server = http.createServer((_req, res) => {
  if (_req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", rooms: rooms.size }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("yjs-collab-server");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const roomName = (req.url ?? "/").slice(1) || "default";
  handleConnection(ws, roomName);
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Yjs collab server running on ws://${HOST}:${PORT}`);
});
