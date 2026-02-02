# Frontend Realtime Socket Guide – Virtual Office (Gather-like)

## Purpose

This document explains how the frontend should integrate with the realtime socket backend
for a GatherTown-like virtual office.

This file is intended to be used as an **OpenSpec / implementation contract** for frontend developers.

---

## Tech Assumptions

- Framework: Phaser
- Socket client: socket.io-client
- Backend namespace: /ws
- Backend spec: realtime socket README (backend)

---

## Socket Connection

### Connect

```ts
import { io } from "socket.io-client"

const socket = io("/ws", {
  auth: {
    token: accessToken
  },
  transports: ["websocket"]
})
```

---

## Join Map

### Emit

```ts
socket.emit("map:join", {
  mapId: "office-main"
})
```

### Receive Snapshot

```ts
socket.on("map:snapshot", (players) => {
  clearAllPlayers()
  players.forEach(player => renderPlayer(player))
})
```

Notes:
- Snapshot is sent once per join
- Snapshot replaces all current state

---

## Handle Players Joining

```ts
socket.on("player:joined", (player) => {
  renderPlayer(player)
})
```

---

## Player Movement

### Emit Movement Intent

```ts
socket.emit("player:move-intent", {
  dx: number,
  dy: number
})
```

Movement intent should be sent at most **10–15 times per second**.

---

## Movement Rendering

### Client-side Prediction

```ts
moveLocalPlayer(dx, dy)
socket.emit("player:move-intent", { dx, dy })
```

### Authoritative Sync

```ts
socket.on("player:moved", ({ userId, x, y }) => {
  if (userId === myUserId) {
    syncMyPlayer(x, y)
  } else {
    moveRemotePlayer(userId, x, y)
  }
})
```

Use interpolation to avoid jitter.

---

## Proximity Updates

```ts
socket.on("proximity:update", (nearbyPlayers) => {
  updateAudioLevels(nearbyPlayers)
})
```

Backend determines proximity.
Frontend controls audio/video volume.

---

## Meeting Room Logic

### Request Join

```ts
socket.emit("meeting:request-join", {
  meetingId: "team-standup"
})
```

### Approved

```ts
socket.on("meeting:approved", ({ meetingId, token }) => {
  connectWebRTC(meetingId, token)
})
```

### Denied

```ts
socket.on("meeting:denied", () => {
  // Optional UI feedback
})
```

### Leave Meeting

```ts
socket.emit("meeting:leave")
disconnectWebRTC()
```

---

## Player Leaving

```ts
socket.on("player:left", ({ userId }) => {
  removePlayer(userId)
})
```

---

## Disconnect & Reconnect

### Disconnect

```ts
socket.on("disconnect", () => {
  showReconnectingUI()
})
```

### Reconnect

```ts
socket.on("connect", () => {
  socket.emit("map:join", { mapId })
})
```

Backend will resend snapshot.

---

## Error Handling

```ts
socket.on("error", (err) => {
  console.error("Socket error", err)
})
```

---

## Event Reference

### Emit (Frontend → Backend)
```
map:join
player:move-intent
meeting:request-join
meeting:leave
```

### Listen (Backend → Frontend)
```
map:snapshot
player:joined
player:moved
player:left
proximity:update
meeting:approved
meeting:denied
```

---

## Best Practices

DO:
- Trust server state
- Clear state on snapshot
- Interpolate movement
- Limit movement rate

DO NOT:
- Teleport locally
- Assume meeting join success
- Store realtime state persistently
- Broadcast your own position

---

## Summary

Frontend sends intent.
Backend owns truth.
Frontend renders state.

This separation ensures stability, scalability, and security.
