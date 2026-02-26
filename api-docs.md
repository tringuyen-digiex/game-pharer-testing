# API Documentation

This document outlines the REST API endpoints and Socket.IO events for the backend application.

## Base URL

- REST API: `http://localhost:3000` (or your configured port)
- Socket.IO: `ws://localhost:3000` (Namespace: `/ws`)

---

## REST API Resources

### Auth Module

`@Controller('auth')`

#### Register

**POST** `/auth/register`
Create a new user account.

**Request Body (`RegisterDto`):**
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Min 6 characters |
| `firstName` | string | No | User's first name |
| `lastName` | string | No | User's last name |

**Response (201 Created):**
Returns the created user object (or auth result depending on implementation).

#### Login

**POST** `/auth/login`
Authenticate a user.

**Request Body (`LoginDto`):**
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | User email |
| `password` | string | Yes | User password |

**Response (200 OK):**
Returns authentication result (e.g., Access Token, User info).

#### Logout

**POST** `/auth/logout`
Invalidate the current session.
_Requires Authentication (Bearer Token)_

**Response (200 OK):**
Success message.

#### Get Current User

**GET** `/auth/me`
Retrieve the profile of the currently logged-in user.
_Requires Authentication (Bearer Token)_

**Response (200 OK):**
Returns `User` profile object.

---

### Maps Module

`@Controller('maps')`
_All endpoints require Authentication_

#### Create Map

**POST** `/maps`
Create a new map within a workspace.

**Request Body (`CreateMapDto`):**
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Map name |
| `width` | number | Yes | Map width (e.g., 100) |
| `height` | number | Yes | Map height (e.g., 100) |
| `tileData` | object | Yes | JSON object representing tile data |
| `workspaceId` | string | Yes | ULID of the workspace |

**Response (201 Created):**
Returns the created `Map` object.

#### List Maps

**GET** `/maps`
List all maps belonging to a specific workspace.

**Query Parameters:**

- `workspaceId` (Required): ID of the workspace to filter by.

**Response (200 OK):**
Returns `Map[]`.

---

### Workspaces Module

`@Controller('workspaces')`
_All endpoints require Authentication_

#### Create Workspace

**POST** `/workspaces`
Create a new workspace for the user.

**Request Body (`CreateWorkspaceDto`):**
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Workspace name |

**Response (201 Created):**
Returns the created `Workspace` object.

#### List Workspaces

**GET** `/workspaces`
List all workspaces the current user is a member of.

**Response (200 OK):**
Returns `Workspace[]` (including membership details).

#### Add Member

**POST** `/workspaces/:id/members`
Add a user to a workspace.

**Path Parameters:**

- `id`: Workspace ID.

**Request Body (`AddMemberDto`):**
| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | Yes | ID of the user to add |
| `role` | enum | Yes | `OWNER`, `ADMIN`, or `MEMBER` |

**Response (201 Created):**
Returns success / member object.

---

### Health Module

`@Controller('health')`

#### Basic Check

**GET** `/health`
Simple liveness probe.

**Response (200 OK):**

```json
{ "status": "ok" }
```

#### Detailed Check

**GET** `/health/detailed`
Detailed health status of components (Database, etc.).

**Response:**
Returns detailed health object. 503 if critical services are down.

---

## Socket.IO Events

**Namespace:** `/ws`
**Authentication:** Pass `auth: { userId: string, (optional) token: string }` in handshake.

### Client -> Server (Emitted by Client)

#### Join Map

**Event:** `map:join`
**Payload (`JoinMapDto`):**

```typescript
{
  mapId: string; // ID of the map to join workspaceId
  initialX: number; // Starting X coordinate
  initialY: number; // Starting Y coordinate
}
```

**Response (Ack):**
Returns `{ event: 'map:snapshot', data: Player[] }`.
**Server Action:** Brcadcasts `player:joined` to other clients in the map room.

#### Move Player

**Event:** `player:move-intent`
**Payload (`MovePlayerDto`):**

```typescript
{
  x: number; // Target X coordinate
  y: number; // Target Y coordinate
}
```

**Response (Ack):**
`{ status: 'accepted' }` or `{ status: 'rejected', reason: string }`
**Server Action:**

- If accepted, broadcasts `player:moved` to others.
- Sends `proximity:update` to the moving client.

#### Join Meeting

**Event:** `meeting:request-join`
**Payload (`MeetingJoinDto`):**

```typescript
{
  meetingId: string; // ID of the meeting/room
}
```

**Response (Ack):**
`{ status: 'joined', meetingId: string }`
**Server Action:** Broadcasts `meeting:joined` to the meeting room.

#### Leave Meeting

**Event:** `meeting:leave`
**Payload:** (Empty)
**Response (Ack):**
`{ status: 'left' }`
**Server Action:** Broadcasts `meeting:left` (custom event logic pending).

---

### Server -> Client (Received by Client)

#### Player Joined

**Event:** `player:joined`
**Payload:**

```typescript
{
  userId: string;
  x: number;
  y: number;
}
```

**Trigger:** Another user joined the map.

#### Player Moved

**Event:** `player:moved`
**Payload:**

```typescript
{
  userId: string;
  x: number;
  y: number;
}
```

**Trigger:** Another user in the map successfully moved.

#### Proximity Update

**Event:** `proximity:update`
**Payload:**

```typescript
{
  nearbyUserIds: string[]; // List of user IDs close to the current user
}
```

**Trigger:** User moved or others moved near them. Used for managing WebRTC connections.

#### Meeting Joined

**Event:** `meeting:joined`
**Payload:**

```typescript
{
  userId: string;
}
```

**Trigger:** A user joined the meeting room.

#### Map Snapshot

**Event:** `map:snapshot` (Sent as data in `map:join` Ack, or separately)
**Payload:**
`Player[]` (List of all players currently in the map)
