import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  // Connect to WebSocket server
  connect(token) {
    if (this.socket && this.connected) {
      console.log('Socket already connected');
      return;
    }

    const baseUrl = API_BASE_URL.replace('/api', '');

    console.log('Connecting to WebSocket:', baseUrl);

    this.socket = io(baseUrl, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventHandlers();
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Set up core event handlers
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.emit('connectionStatusChanged', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connected = false;
      this.emit('connectionStatusChanged', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('error', { message: error.message });
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Broadcast events
    this.socket.on('broadcast-state', (data) => {
      console.log('Received broadcast state:', data);
      this.emit('broadcastState', data);
    });

    this.socket.on('track-changed', (track) => {
      console.log('Track changed:', track);
      this.emit('trackChanged', track);
    });

    this.socket.on('listener-joined', (data) => {
      console.log('Listener joined:', data);
      this.emit('listenerJoined', data);
    });

    this.socket.on('listener-left', (data) => {
      console.log('Listener left:', data);
      this.emit('listenerLeft', data);
    });

    this.socket.on('new-message', (message) => {
      console.log('New message:', message);
      this.emit('newMessage', message);
    });

    this.socket.on('broadcast-started', (broadcast) => {
      console.log('Broadcast started:', broadcast);
      this.emit('broadcastStarted', broadcast);
    });

    this.socket.on('broadcast-ended', (data) => {
      console.log('Broadcast ended:', data);
      this.emit('broadcastEnded', data);
    });

    this.socket.on('tip-received', (data) => {
      console.log('Tip received:', data);
      this.emit('tipReceived', data);
    });
  }

  // Join a broadcast room
  joinBroadcast(broadcastId) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log('Joining broadcast:', broadcastId);
    this.socket.emit('join-broadcast', broadcastId);
  }

  // Leave a broadcast room
  leaveBroadcast(broadcastId) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log('Leaving broadcast:', broadcastId);
    this.socket.emit('leave-broadcast', broadcastId);
  }

  // Send a chat message
  sendMessage(broadcastId, messageType, content) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('send-message', {
      broadcastId,
      messageType,
      content,
    });
  }

  // Send heartbeat (for curators)
  sendHeartbeat(broadcastId) {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('broadcast-heartbeat', broadcastId);
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit event to listeners
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  // Check connection status
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export default new SocketService();
