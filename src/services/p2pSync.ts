import Peer, { DataConnection } from 'peerjs';
import { BackupData } from '../utils/exportImport';
import { packQRData, unpackQRData } from '../utils/qrDataTransfer';

export type SyncConnectionStatus =
  | 'INITIALIZING'
  | 'WAITING_FOR_SCAN'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'TRANSFERRING'
  | 'SUCCESS'
  | 'ERROR';

export interface P2PMessage {
  type: 'SYNC_PAYLOAD' | 'SYNC_ACK';
  payload?: BackupData;
  packedData?: string;
  message?: string;
}

/**
 * Generates a random session ID for peer pairing
 */
export function generateSessionId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'sm-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format of QR Code displayed on the PC screen
 */
export function formatPairingQR(sessionId: string): string {
  return `SMPAIR:${sessionId}`;
}

/**
 * Parses pairing QR code string to extract sessionId
 */
export function parsePairingQR(qrString: string): string | null {
  const trimmed = qrString.trim();
  if (trimmed.startsWith('SMPAIR:')) {
    return trimmed.slice(7);
  }
  // If it's just the raw session id
  if (trimmed.startsWith('sm-')) {
    return trimmed;
  }
  return null;
}

export interface ReceiverController {
  peerId: string;
  close: () => void;
}

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

/**
 * Starts a WebRTC Receiver session on the PC.
 * Listens for incoming phone connection and handles data transfer.
 */
export function startPCReceiver(
  onStatusChange: (status: SyncConnectionStatus, error?: string) => void,
  onDataReceived: (data: BackupData) => void,
  onSessionReady?: (sessionId: string) => void
): ReceiverController {
  const sessionId = generateSessionId();
  onStatusChange('INITIALIZING');

  let activePeer: Peer | null = null;
  let activeConn: DataConnection | null = null;

  try {
    activePeer = new Peer(sessionId, PEER_CONFIG);

    activePeer.on('open', (id) => {
      onStatusChange('WAITING_FOR_SCAN');
      if (onSessionReady) onSessionReady(id);
    });

    activePeer.on('connection', (conn) => {
      activeConn = conn;
      onStatusChange('CONNECTED');

      conn.on('data', (rawMsg: any) => {
        try {
          onStatusChange('TRANSFERRING');
          const msg = rawMsg as P2PMessage;

          if (msg.type === 'SYNC_PAYLOAD') {
            let payload = msg.payload;
            if (!payload && msg.packedData) {
              payload = unpackQRData(msg.packedData);
            }
            if (payload) {
              onDataReceived(payload);
              conn.send({ type: 'SYNC_ACK', message: 'Payload received successfully' });
              onStatusChange('SUCCESS');
            } else {
              throw new Error('Empty payload received');
            }
          }
        } catch (err: any) {
          onStatusChange('ERROR', err?.message || 'Failed to parse incoming payload');
        }
      });

      conn.on('close', () => {
        // Connection closed
      });

      conn.on('error', (err) => {
        onStatusChange('ERROR', err?.message || 'Connection error with phone');
      });
    });

    activePeer.on('error', (err) => {
      onStatusChange('ERROR', err?.message || 'Peer connection failed');
    });

    activePeer.on('disconnected', () => {
      try {
        activePeer?.reconnect();
      } catch {}
    });
  } catch (err: any) {
    onStatusChange('ERROR', err?.message || 'Failed to start peer receiver');
  }

  return {
    peerId: sessionId,
    close: () => {
      if (activeConn) {
        try {
          activeConn.close();
        } catch {}
      }
      if (activePeer) {
        try {
          activePeer.destroy();
        } catch {}
      }
    }
  };
}

export interface SenderController {
  sendPayload: (payload: BackupData) => Promise<boolean>;
  close: () => void;
}

/**
 * Connects phone to PC using the scanned sessionId and streams data over WebRTC.
 * Awaits connection readiness gracefully if send is clicked while handshake is resolving.
 */
export function connectPhoneToPC(
  targetSessionId: string,
  onStatusChange: (status: SyncConnectionStatus, error?: string) => void,
  onAckReceived?: () => void
): SenderController {
  onStatusChange('CONNECTING');

  let peer: Peer | null = null;
  let connection: DataConnection | null = null;
  let isConnectionOpen = false;

  let resolveReady: (conn: DataConnection) => void = () => {};
  let rejectReady: (err: Error) => void = () => {};

  const readyPromise = new Promise<DataConnection>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  try {
    peer = new Peer(PEER_CONFIG);

    peer.on('open', () => {
      if (!peer) return;
      const conn = peer.connect(targetSessionId, { reliable: true });
      connection = conn;

      conn.on('open', () => {
        isConnectionOpen = true;
        onStatusChange('CONNECTED');
        resolveReady(conn);
      });

      conn.on('data', (rawMsg: any) => {
        const msg = rawMsg as P2PMessage;
        if (msg.type === 'SYNC_ACK') {
          onStatusChange('SUCCESS');
          if (onAckReceived) onAckReceived();
        }
      });

      conn.on('error', (err) => {
        const msg = err?.message || 'Data connection error';
        onStatusChange('ERROR', msg);
        rejectReady(new Error(msg));
      });
    });

    peer.on('error', (err) => {
      const msg = err?.message || 'Could not connect to PC session';
      onStatusChange('ERROR', msg);
      rejectReady(new Error(msg));
    });

    peer.on('disconnected', () => {
      try {
        peer?.reconnect();
      } catch {}
    });
  } catch (err: any) {
    onStatusChange('ERROR', err?.message || 'Initialization failed');
    rejectReady(err);
  }

  return {
    sendPayload: async (payload: BackupData): Promise<boolean> => {
      let activeConn = connection;

      // If not yet open, wait for the connection handshake to finish (up to 15s)
      if (!activeConn || !isConnectionOpen) {
        onStatusChange('CONNECTING');
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Connection timeout. Please ensure the QR code is still open on your PC monitor and tap Rescan.'
                )
              ),
            15000
          )
        );

        activeConn = await Promise.race([readyPromise, timeoutPromise]);
      }

      if (!activeConn) {
        throw new Error('Could not establish connection to PC. Please tap Rescan and try again.');
      }

      onStatusChange('TRANSFERRING');
      let packedData: string | undefined = undefined;
      try {
        packedData = packQRData(payload);
      } catch {}

      const message: P2PMessage = {
        type: 'SYNC_PAYLOAD',
        payload,
        packedData
      };

      activeConn.send(message);
      return true;
    },
    close: () => {
      if (connection) {
        try {
          connection.close();
        } catch {}
      }
      if (peer) {
        try {
          peer.destroy();
        } catch {}
      }
    }
  };
}
