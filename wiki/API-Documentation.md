# API Documentation

This document provides comprehensive information about the Mbira Hub API endpoints and WebSocket connections.

## 🌐 Base URL

- **Production**: `https://infinicore.co.zw:9445`
- **Development**: `https://localhost:9445`

## 🔐 Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## 📡 REST API Endpoints

### Health Check

#### GET /health
Check application health and status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-28T15:30:57.117Z",
  "uptime": 35.256945165,
  "memory": {
    "rss": 87961600,
    "heapTotal": 28925952,
    "heapUsed": 19991248,
    "external": 2627329,
    "arrayBuffers": 218674
  },
  "version": "1.0.0",
  "environment": "production"
}
```

### Sessions

#### GET /api/sessions
Get all available sessions.

**Response:**
```json
{
  "sessions": [
    {
      "id": "session_abc123",
      "name": "Practice Session",
      "createdAt": "2025-09-28T15:30:57.117Z",
      "isActive": true
    }
  ]
}
```

#### POST /api/sessions
Create a new session.

**Request Body:**
```json
{
  "name": "My Practice Session",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "ok": true,
  "id": "session_xyz789",
  "message": "Session created successfully"
}
```

#### DELETE /api/sessions/:id
Delete a session.

**Parameters:**
- `id` (string): Session ID

**Response:**
```json
{
  "ok": true,
  "message": "Session deleted successfully"
}
```

### Audio Processing

#### POST /api/audio/calibrate
Start audio calibration process.

**Request Body:**
```json
{
  "samples": 10,
  "duration": 5000
}
```

**Response:**
```json
{
  "ok": true,
  "calibration": {
    "baselineLevel": 45.2,
    "sensitivityMultiplier": 1.2,
    "adaptiveThreshold": 60
  }
}
```

#### POST /api/audio/detect
Process audio for note detection.

**Request Body:**
```json
{
  "audioData": "base64-encoded-audio-data",
  "sampleRate": 48000
}
```

**Response:**
```json
{
  "ok": true,
  "detection": {
    "note": "F3",
    "frequency": 174.61,
    "confidence": 0.95,
    "timestamp": "2025-09-28T15:30:57.117Z"
  }
}
```

### Instrument Training

#### GET /api/instruments
Get all trained instruments.

**Response:**
```json
{
  "instruments": [
    {
      "id": "instrument_123",
      "name": "My Mbira",
      "trainedNotes": ["F3", "G3", "A3", "C4"],
      "accuracy": 0.92,
      "createdAt": "2025-09-28T15:30:57.117Z"
    }
  ]
}
```

#### POST /api/instruments
Create a new instrument training.

**Request Body:**
```json
{
  "name": "My New Mbira",
  "notes": {
    "F3": [174.61, 174.58, 174.63, 174.60],
    "G3": [196.00, 195.98, 196.02, 196.01]
  }
}
```

**Response:**
```json
{
  "ok": true,
  "instrumentId": "instrument_456",
  "message": "Instrument training completed successfully"
}
```

#### POST /api/instruments/:id/test
Test a trained instrument.

**Parameters:**
- `id` (string): Instrument ID

**Request Body:**
```json
{
  "audioData": "base64-encoded-audio-data"
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "detectedNote": "F3",
    "confidence": 0.88,
    "expectedNote": "F3",
    "match": true
  }
}
```

## 🔌 WebSocket API

### Connection

Connect to the WebSocket server:

```javascript
const ws = new WebSocket('wss://infinicore.co.zw:9445/ws');
```

### Events

#### Real-time Note Detection

**Client → Server:**
```json
{
  "type": "start_detection",
  "sessionId": "session_123",
  "instrumentId": "instrument_456"
}
```

**Server → Client:**
```json
{
  "type": "note_detected",
  "data": {
    "note": "F3",
    "frequency": 174.61,
    "confidence": 0.95,
    "timestamp": "2025-09-28T15:30:57.117Z"
  }
}
```

#### Session Updates

**Client → Server:**
```json
{
  "type": "join_session",
  "sessionId": "session_123",
  "password": "secure_password"
}
```

**Server → Client:**
```json
{
  "type": "session_joined",
  "data": {
    "sessionId": "session_123",
    "participants": ["user1", "user2"],
    "status": "active"
  }
}
```

#### Training Progress

**Server → Client:**
```json
{
  "type": "training_progress",
  "data": {
    "step": 5,
    "totalSteps": 12,
    "currentNote": "C4",
    "samplesCollected": 3,
    "samplesNeeded": 4
  }
}
```

### WebSocket Event Types

| Event Type | Direction | Description |
|------------|-----------|-------------|
| `start_detection` | Client → Server | Start real-time note detection |
| `stop_detection` | Client → Server | Stop note detection |
| `note_detected` | Server → Client | Note detection result |
| `join_session` | Client → Server | Join a learning session |
| `leave_session` | Client → Server | Leave current session |
| `session_joined` | Server → Client | Confirmation of session join |
| `session_left` | Server → Client | Confirmation of session leave |
| `training_start` | Client → Server | Start instrument training |
| `training_progress` | Server → Client | Training progress update |
| `training_complete` | Server → Client | Training completion |
| `error` | Server → Client | Error message |

## 📊 Data Models

### Session
```typescript
interface Session {
  id: string;
  name: string;
  password: string;
  createdAt: Date;
  isActive: boolean;
  participants: string[];
}
```

### Instrument
```typescript
interface Instrument {
  id: string;
  name: string;
  trainedNotes: string[];
  noteFrequencies: Record<string, number[]>;
  accuracy: number;
  createdAt: Date;
}
```

### Note Detection
```typescript
interface NoteDetection {
  note: string;
  frequency: number;
  confidence: number;
  timestamp: Date;
  sessionId?: string;
}
```

### Audio Calibration
```typescript
interface AudioCalibration {
  baselineLevel: number;
  sensitivityMultiplier: number;
  adaptiveThreshold: number;
  maxThreshold: number;
  minThreshold: number;
}
```

## 🚨 Error Handling

### HTTP Error Responses

All API endpoints return consistent error responses:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "name",
      "reason": "Name is required"
    }
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

### WebSocket Error Events

```json
{
  "type": "error",
  "data": {
    "code": "MICROPHONE_ACCESS_DENIED",
    "message": "Microphone access is required for note detection",
    "timestamp": "2025-09-28T15:30:57.117Z"
  }
}
```

## 🔧 Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute
- **Audio processing**: 20 requests per minute
- **Session creation**: 10 requests per minute
- **Training operations**: 5 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1632840000
```

## 📝 Examples

### JavaScript Client Example

```javascript
// Create a session
const createSession = async (name, password) => {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, password })
  });
  return response.json();
};

// WebSocket connection
const ws = new WebSocket('wss://infinicore.co.zw:9445/ws');

ws.onopen = () => {
  console.log('Connected to Mbira Hub');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'note_detected') {
    console.log('Note detected:', data.data.note);
  }
};

// Start note detection
ws.send(JSON.stringify({
  type: 'start_detection',
  sessionId: 'session_123'
}));
```

### Python Client Example

```python
import requests
import websocket
import json

# Create a session
def create_session(name, password):
    response = requests.post('https://infinicore.co.zw:9445/api/sessions', 
                           json={'name': name, 'password': password})
    return response.json()

# WebSocket connection
def on_message(ws, message):
    data = json.loads(message)
    if data['type'] == 'note_detected':
        print(f"Note detected: {data['data']['note']}")

ws = websocket.WebSocketApp("wss://infinicore.co.zw:9445/ws",
                          on_message=on_message)
ws.run_forever()
```

---

**Need help?** Check the [Troubleshooting Guide](Troubleshooting) or create an issue on GitHub.
