import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoCallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState("Connecting...");
  const [remoteJoined, setRemoteJoined] = useState(false);

  const user = JSON.parse(localStorage.getItem("business_nexus_user") || "{}");

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();
    socketRef.current?.disconnect();
  }, []);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("ice-candidate", event.candidate, roomId);
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      return pc;
    },
    [roomId],
  );

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socketRef.current = io(SOCKET_URL);

      socketRef.current.on("connect", () => {
        setCallStatus("Waiting for other person...");
        socketRef.current?.emit("join-room", roomId, user.id);
      });

      socketRef.current.on("user-joined", async () => {
        setCallStatus("Someone joined — connecting...");
        setRemoteJoined(true);
        const pc = createPeerConnection(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("offer", offer, roomId);
      });

      socketRef.current.on(
        "offer",
        async (offer: RTCSessionDescriptionInit) => {
          const pc = createPeerConnection(stream);
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit("answer", answer, roomId);
          setRemoteJoined(true);
          setCallStatus("Connected");
        },
      );

      socketRef.current.on(
        "answer",
        async (answer: RTCSessionDescriptionInit) => {
          await peerConnectionRef.current!.setRemoteDescription(answer);
          setCallStatus("Connected");
        },
      );

      socketRef.current.on(
        "ice-candidate",
        async (candidate: RTCIceCandidateInit) => {
          try {
            await peerConnectionRef.current!.addIceCandidate(candidate);
          } catch (e) {
            console.error("Error adding ICE candidate", e);
          }
        },
      );

      socketRef.current.on("peer-audio-toggle", () => {});
      socketRef.current.on("peer-video-toggle", () => {});

      socketRef.current.on("call-ended", () => {
        setCallStatus("Call ended by other person");
        setTimeout(() => navigate("/"), 2000);
      });

      socketRef.current.on("user-disconnected", () => {
        setCallStatus("Other person disconnected");
        setRemoteJoined(false);
      });
    } catch (err) {
      console.error("Could not access camera/mic:", err);
      setCallStatus("Could not access camera or microphone");
    }
  }, [roomId, user.id, navigate, createPeerConnection]);

  useEffect(() => {
    startCall();
    return () => cleanup();
  }, [startCall, cleanup]);

  function toggleAudio() {
    if (localStreamRef.current) {
      const enabled = !audioEnabled;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      setAudioEnabled(enabled);
      socketRef.current?.emit("toggle-audio", roomId, enabled);
    }
  }

  function toggleVideo() {
    if (localStreamRef.current) {
      const enabled = !videoEnabled;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
      setVideoEnabled(enabled);
      socketRef.current?.emit("toggle-video", roomId, enabled);
    }
  }

  function endCall() {
    socketRef.current?.emit("end-call", roomId);
    cleanup();
    navigate("/");
  }

  return (
    <div
      style={{
        backgroundColor: "#111",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <p style={{ marginBottom: 16, fontSize: 14, color: "#aaa" }}>
        Room: {roomId} — {callStatus}
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ position: "relative" }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: 560,
              height: 360,
              backgroundColor: "#222",
              borderRadius: 12,
              objectFit: "cover",
            }}
          />
          {!remoteJoined && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#222",
                borderRadius: 12,
              }}
            >
              <p style={{ color: "#666" }}>Waiting for other person...</p>
            </div>
          )}
        </div>

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: 200,
            height: 150,
            backgroundColor: "#333",
            borderRadius: 8,
            objectFit: "cover",
            alignSelf: "flex-end",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={toggleAudio}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            backgroundColor: audioEnabled ? "#333" : "#c0392b",
            color: "white",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {audioEnabled ? "Mute" : "Unmute"}
        </button>

        <button
          onClick={toggleVideo}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            backgroundColor: videoEnabled ? "#333" : "#c0392b",
            color: "white",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {videoEnabled ? "Stop Video" : "Start Video"}
        </button>

        <button
          onClick={endCall}
          style={{
            padding: "10px 28px",
            borderRadius: 8,
            border: "none",
            backgroundColor: "#e74c3c",
            color: "white",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
          }}
        >
          End Call
        </button>
      </div>
    </div>
  );
}
