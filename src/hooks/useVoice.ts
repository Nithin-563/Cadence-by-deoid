import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

/**
 * Peer-to-peer voice over WebRTC.
 *
 * Supabase Realtime *broadcast* carries the signalling only — SDP offers,
 * answers and ICE candidates. Audio never touches Supabase; it flows directly
 * between browsers. That means there is no media server to run, but it also
 * means a full mesh: each participant uploads N-1 streams. That is comfortable
 * to roughly 6 people; beyond that you want a real SFU.
 */

export interface RemotePeer {
  sessionId: string;
  userId: string;
  connection: RTCPeerConnection;
  audio: HTMLAudioElement;
  video: HTMLVideoElement;
}

export interface VoiceFlags {
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  sharingScreen: boolean;
}

export interface VoiceParticipant extends VoiceFlags {
  /** "me" for the local user, otherwise a profile id. */
  userId: string;
  isSelf: boolean;
}

export interface VoiceState {
  status: "idle" | "connecting" | "connected" | "failed";
  error: string | null;
  channelId: string | null;
  participants: VoiceParticipant[];
  muted: boolean;
  deafened: boolean;
  sharingScreen: boolean;
  screenStream: MediaStream | null;
  /** Remote screen-share streams, keyed by the sharing user's id. */
  screenStreams: Record<string, MediaStream>;
  join: (channelId: string) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleScreenShare: () => Promise<void>;
}

/** Google STUN covers most NATs. TURN would need a server you operate. */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Past this the mesh stops being viable for most connections. */
export const MAX_MESH_PEERS = 6;

const EMPTY_FLAGS: VoiceFlags = {
  muted: false,
  deafened: false,
  speaking: false,
  sharingScreen: false,
};

type Signal =
  | { kind: "hello"; from: string; userId: string }
  | { kind: "offer"; from: string; to: string; userId: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; to: string; userId: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; to: string; userId: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string; userId: string }
  | { kind: "flags"; from: string; userId: string; muted: boolean; deafened: boolean; speaking: boolean }
  | { kind: "screen"; from: string; userId: string; sharing: boolean };

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useVoice(userId: string | undefined): VoiceState {
  const [status, setStatus] = React.useState<VoiceState["status"]>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [deafened, setDeafened] = React.useState(false);
  const [sharingScreen, setSharingScreen] = React.useState(false);
  const [screenStream, setScreenStream] = React.useState<MediaStream | null>(null);
  const [localSpeaking, setLocalSpeaking] = React.useState(false);
  const [screenStreams, setScreenStreams] = React.useState<Record<string, MediaStream>>({});
  const [remote, setRemote] = React.useState<Record<string, VoiceFlags & { userId: string }>>({});

  const sessionIdRef = React.useRef(randomId());
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const screenTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const peersRef = React.useRef<Map<string, RemotePeer>>(new Map());
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const analyserRef = React.useRef<number | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const flagsRef = React.useRef<VoiceFlags>(EMPTY_FLAGS);

  const me = userId ?? "";

  const send = React.useCallback(
    (message: Signal) => {
      const channel = channelRef.current;
      if (!channel) return;
      void channel.send({ type: "broadcast", event: "signal", payload: message });
    },
    [],
  );

  const patchRemote = React.useCallback(
    (sessionId: string, userIdValue: string, patch: Partial<VoiceFlags>) => {
      setRemote((current) => {
        const existing = current[sessionId] ?? { ...EMPTY_FLAGS, userId: userIdValue };
        return { ...current, [sessionId]: { ...existing, userId: userIdValue, ...patch } };
      });
    },
    [],
  );

  /* ------------------------------------------------------------- peers --- */

  const createPeer = React.useCallback(
    async (remoteSessionId: string, remoteUserId: string, initiator: boolean) => {
      const existing = peersRef.current.get(remoteSessionId);
      if (existing) return existing;

      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Detached media elements are enough for audio; nothing needs the DOM.
      const audio = new Audio();
      audio.autoplay = true;
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      const local = localStreamRef.current;
      if (local) {
        for (const track of local.getTracks()) {
          connection.addTrack(track, local);
        }
      }

      connection.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        if (event.track.kind === "audio") {
          audio.srcObject = stream;
          audio.muted = flagsRef.current.deafened;
          void audio.play().catch(() => undefined);
        } else {
          video.srcObject = stream;
          void video.play().catch(() => undefined);
          // Expose the screen share so the stage can render it.
          setScreenStreams((current) => ({ ...current, [remoteUserId]: stream }));
        }
      };

      connection.onicecandidate = (event) => {
        if (!event.candidate) return;
        send({
          kind: "ice",
          from: sessionIdRef.current,
          to: remoteSessionId,
          userId: me,
          candidate: event.candidate.toJSON(),
        });
      };

      connection.onconnectionstatechange = () => {
        // Transient failures are normal; ICE restart recovers most of them.
        if (connection.connectionState === "failed") {
          connection.restartIce?.();
        }
      };

      const peer: RemotePeer = {
        sessionId: remoteSessionId,
        userId: remoteUserId,
        connection,
        audio,
        video,
      };
      peersRef.current.set(remoteSessionId, peer);

      if (initiator) {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        send({
          kind: "offer",
          from: sessionIdRef.current,
          to: remoteSessionId,
          userId: me,
          sdp: offer,
        });
      }

      return peer;
    },
    [me, send],
  );

  /* -------------------------------------------------------- signalling --- */

  const handleSignal = React.useCallback(
    async (message: Signal) => {
      if (message.from === sessionIdRef.current) return;

      switch (message.kind) {
        case "hello": {
          patchRemote(message.from, message.userId, {});
          // Deterministic initiator avoids glare — only one side offers.
          const iAmInitiator = sessionIdRef.current < message.from;
          await createPeer(message.from, message.userId, iAmInitiator);
          break;
        }

        case "offer": {
          const peer = await createPeer(message.from, message.userId, false);
          await peer.connection.setRemoteDescription(message.sdp);
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);
          send({
            kind: "answer",
            from: sessionIdRef.current,
            to: message.from,
            userId: me,
            sdp: answer,
          });
          break;
        }

        case "answer": {
          const peer = peersRef.current.get(message.from);
          if (peer) {
            await peer.connection.setRemoteDescription(message.sdp).catch(() => undefined);
          }
          break;
        }

        case "ice": {
          const peer = peersRef.current.get(message.from);
          if (peer && message.candidate) {
            await peer.connection.addIceCandidate(message.candidate).catch(() => undefined);
          }
          break;
        }

        case "bye": {
          const peer = peersRef.current.get(message.from);
          peer?.connection.close();
          peersRef.current.delete(message.from);
          setRemote((current) => {
            const next = { ...current };
            delete next[message.from];
            return next;
          });
          break;
        }

        case "flags": {
          patchRemote(message.from, message.userId, {
            muted: message.muted,
            deafened: message.deafened,
            speaking: message.speaking,
          });
          break;
        }

        case "screen": {
          patchRemote(message.from, message.userId, { sharingScreen: message.sharing });
          break;
        }
      }
    },
    [createPeer, send, me, patchRemote],
  );

  /* ------------------------------------------------ speaking detection --- */

  const stopDetection = React.useCallback(() => {
    if (analyserRef.current !== null) {
      window.clearInterval(analyserRef.current);
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    setLocalSpeaking(false);
  }, []);

  const startDetection = React.useCallback(
    (stream: MediaStream) => {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      const context = new Ctor();
      audioContextRef.current = context;

      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      analyserRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (const value of data) sum += value;
        const speaking = sum / data.length > 18;
        if (speaking === wasSpeaking) return;

        wasSpeaking = speaking;
        setLocalSpeaking(speaking);
        send({
          kind: "flags",
          from: sessionIdRef.current,
          userId: me,
          muted: flagsRef.current.muted,
          deafened: flagsRef.current.deafened,
          speaking,
        });
      }, 220);
    },
    [send, me],
  );

  /* --------------------------------------------------------- join/leave --- */

  const leave = React.useCallback(() => {
    send({ kind: "bye", from: sessionIdRef.current, userId: me });

    for (const peer of peersRef.current.values()) {
      peer.connection.close();
      peer.audio.pause();
      peer.video.pause();
    }
    peersRef.current.clear();

    screenTrackRef.current?.stop();
    screenTrackRef.current = null;

    for (const track of localStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    localStreamRef.current = null;

    stopDetection();

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    sessionIdRef.current = randomId();
    flagsRef.current = EMPTY_FLAGS;

    setStatus("idle");
    setChannelId(null);
    setMuted(false);
    setDeafened(false);
    setSharingScreen(false);
    setScreenStream(null);
    setScreenStreams({});
    setRemote({});
  }, [send, stopDetection, me]);

  const join = React.useCallback(
    async (targetChannelId: string) => {
      if (!me) return;
      if (status === "connecting" || status === "connected") return;

      setStatus("connecting");
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("failed");
        setError("This browser doesn't support microphone capture.");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
      } catch {
        setStatus("failed");
        setError(
          "Microphone access was blocked. Allow the mic for this site in your browser settings, then join again.",
        );
        return;
      }

      localStreamRef.current = stream;
      sessionIdRef.current = randomId();
      startDetection(stream);

      const channel = supabase.channel(`cadence:voice:${targetChannelId}`);
      channelRef.current = channel;
      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        void handleSignal(payload as Signal);
      });
      await channel.subscribe();

      // Announce; everyone already here will offer back if they sort first.
      send({ kind: "hello", from: sessionIdRef.current, userId: me });

      setChannelId(targetChannelId);
      setStatus("connected");
    },
    [status, send, startDetection, handleSignal, me],
  );

  /* ---------------------------------------------------------- controls --- */

  const broadcastFlags = React.useCallback(
    (next: VoiceFlags) => {
      flagsRef.current = next;
      send({
        kind: "flags",
        from: sessionIdRef.current,
        userId: me,
        muted: next.muted,
        deafened: next.deafened,
        speaking: next.speaking,
      });
    },
    [send, me],
  );

  const toggleMute = React.useCallback(() => {
    const next = { ...flagsRef.current, muted: !flagsRef.current.muted };
    for (const track of localStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = !next.muted;
    }
    setMuted(next.muted);
    broadcastFlags(next);
  }, [broadcastFlags]);

  const toggleDeafen = React.useCallback(() => {
    const nextDeaf = !flagsRef.current.deafened;
    // Deafening implies muting, the way Discord does it.
    const next = {
      ...flagsRef.current,
      deafened: nextDeaf,
      muted: nextDeaf ? true : flagsRef.current.muted,
    };

    for (const track of localStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = !next.muted;
    }
    for (const peer of peersRef.current.values()) {
      peer.audio.muted = nextDeaf;
    }

    setDeafened(next.deafened);
    setMuted(next.muted);
    broadcastFlags(next);
  }, [broadcastFlags]);

  const toggleScreenShare = React.useCallback(async () => {
    if (sharingScreen) {
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      setSharingScreen(false);
      setScreenStream(null);
      send({ kind: "screen", from: sessionIdRef.current, userId: me, sharing: false });

      for (const peer of peersRef.current.values()) {
        const sender = peer.connection
          .getSenders()
          .find((candidate) => candidate.track?.kind === "video");
        await sender?.replaceTrack(null).catch(() => undefined);
      }
      return;
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const [track] = display.getVideoTracks();
      if (!track) return;

      screenTrackRef.current = track;
      track.onended = () => void toggleScreenShare();
      setSharingScreen(true);
      setScreenStream(display);
      send({ kind: "screen", from: sessionIdRef.current, userId: me, sharing: true });

      for (const peer of peersRef.current.values()) {
        await peer.connection.addTrack(track, display).catch(() => undefined);
      }
    } catch {
      // Picker cancelled, or the browser refused — not an error worth showing.
    }
  }, [sharingScreen, send, me]);

  // Don't leak the mic if the tab closes mid-call.
  React.useEffect(() => {
    const onUnload = () => leave();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [leave]);

  const participants = React.useMemo<VoiceParticipant[]>(() => {
    const list: VoiceParticipant[] = [
      {
        userId: "me",
        isSelf: true,
        muted,
        deafened,
        speaking: localSpeaking,
        sharingScreen,
      },
    ];

    for (const state of Object.values(remote)) {
      list.push({
        userId: state.userId,
        isSelf: false,
        muted: state.muted,
        deafened: state.deafened,
        speaking: state.speaking,
        sharingScreen: state.sharingScreen,
      });
    }

    return list;
  }, [muted, deafened, localSpeaking, sharingScreen, remote]);

  return {
    status,
    error,
    channelId,
    participants,
    muted,
    deafened,
    sharingScreen,
    screenStream,
    screenStreams,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
  };
}