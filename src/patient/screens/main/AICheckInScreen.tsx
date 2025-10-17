import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Audio from 'expo-audio';
import { Buffer } from 'buffer';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS } from '../../../shared/constants';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import api from '../../../shared/api';


type RouteParams = { appointmentId: string; procedureType?: string };

export const AICheckInScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { appointmentId, procedureType } = (route.params || {}) as RouteParams;

  const [recording, setRecording] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isDone, setIsDone] = useState(false);
  const [finishedMessage, setFinishedMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const streamingRef = useRef<boolean>(false);
  const ttsChunksRef = useRef<Buffer[]>([]);
  const ttsFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAssistantSpeakingRef = useRef<boolean>(false);
  const playerRef = useRef<Audio.AudioPlayer | null>(null);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<string>('');
  const [heygenToken, setHeygenToken] = useState<string | null>(null);
  const [avatarReady, setAvatarReady] = useState<boolean>(false);
  const webSdkRef = useRef<any>(null);
  const avatarReadyRef = useRef<boolean>(false);
  const pendingSpeakQueueRef = useRef<string[]>([]);
  const heygenEnabledRef = useRef<boolean>(false);
  const avatarSessionIdRef = useRef<string | null>(null);
  const readyTestFiredRef = useRef<boolean>(false);
  const lastSpokenTextRef = useRef<string>('');
  const lastSpeakAtRef = useRef<number>(0);
  const [canSpeak, setCanSpeak] = useState<boolean>(false);
  const awaitingAvatarTaskRef = useRef<boolean>(false);
  const [syncedTranscript, setSyncedTranscript] = useState<string>('');
  const pendingAssistantTextRef = useRef<string>('');
  const typeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typeInfoRef = useRef<{ text: string; duration: number; startedAt: number } | null>(null);
  const [preparing, setPreparing] = useState<boolean>(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [requiredExams, setRequiredExams] = useState<any[]>([]);
  const [loadingRequired, setLoadingRequired] = useState<boolean>(false);
  const [extractionValues, setExtractionValues] = useState<Record<string, any> | null>(null);

  const detachFromHeygen = (reason?: string) => {
    try { console.log('Detaching HeyGen:', reason || ''); } catch {}
    heygenEnabledRef.current = false;
    setHeygenToken(null);
    setAvatarReady(false); avatarReadyRef.current = false;
    awaitingAvatarTaskRef.current = false;
    if (typeTimerRef.current) { clearInterval(typeTimerRef.current); typeTimerRef.current = null; }
  };

  const startTypewriter = (text: string, durationMs: number) => {
    if (!text) { setSyncedTranscript(''); return; }
    if (typeTimerRef.current) { clearInterval(typeTimerRef.current); typeTimerRef.current = null; }
    const safeDur = Math.max(300, Math.min(180000, durationMs || 0));
    if (!safeDur) { setSyncedTranscript(text); typeInfoRef.current = null; return; }
    typeInfoRef.current = { text, duration: safeDur, startedAt: Date.now() };
    setSyncedTranscript('');
    typeTimerRef.current = setInterval(() => {
      const info = typeInfoRef.current; if (!info) return;
      const elapsed = Date.now() - info.startedAt;
      const p = Math.max(0, Math.min(1, elapsed / info.duration));
      const chars = Math.max(1, Math.floor(info.text.length * p));
      setSyncedTranscript(info.text.slice(0, chars));
      if (p >= 1) { clearInterval(typeTimerRef.current!); typeTimerRef.current = null; }
    }, 45);
  };
  // Recorder setup using expo-audio
  const recorder = Audio.useAudioRecorder({
    extension: '.wav',
    sampleRate: 24000,
    numberOfChannels: 1,
    bitRate: 256000,
    android: { outputFormat: 'webm', audioEncoder: 'aac' },
    ios: { audioQuality: Audio.AudioQuality.HIGH, outputFormat: Audio.IOSOutputFormat.LINEARPCM },
    web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const perm = await Audio.requestRecordingPermissionsAsync();
        if (perm.status !== 'granted') { Alert.alert('Permission required', 'Microphone permission is needed.'); return; }
        await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers', interruptionModeAndroid: 'duckOthers', shouldRouteThroughEarpiece: false });
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const base = API_BASE_URL.replace('/api/v1', '');
        const socket = io(`${base}/ai-realtime`, { auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => setIsConnecting(false));
        socket.on('disconnect', () => {});
        socket.on('ready', async () => {
          // Session ready; mic will be controlled strictly by press-and-hold
        });
        socket.on('question', (msg: any) => setQuestion(msg.text));
        socket.on('assistant_text_delta', (msg: { delta: string; text: string }) => {
          // Buffer only; do not render until avatar begins speaking
          pendingAssistantTextRef.current = msg.text || pendingAssistantTextRef.current;
        });
        // Disable mic as soon as assistant starts (avatar or TTS)
        socket.on('assistant_text_delta', () => {
          // Disable mic as soon as assistant starts (avatar or TTS)
          setCanSpeak(false);
          if (heygenEnabledRef.current) awaitingAvatarTaskRef.current = true;
        });
        socket.on('final_transcript', async (msg: { text: string }) => {
          setTranscript(msg.text); // keep raw
          pendingAssistantTextRef.current = msg.text || pendingAssistantTextRef.current;
          try {
            if (heygenEnabledRef.current) {
              if (!avatarReadyRef.current) {
                pendingSpeakQueueRef.current.push(msg.text || '');
              } else {
                awaitingAvatarTaskRef.current = true;
                setCanSpeak(false);
                await speakViaPlayer(msg.text);
              }
            } else {
              // TTS-only path: start showing immediately; enable mic on ai_audio_done
              setSyncedTranscript(msg.text || '');
              setCanSpeak(false);
            }
          } catch {}
        });
        socket.on('turn_ready', () => { if (!heygenEnabledRef.current || !awaitingAvatarTaskRef.current) setCanSpeak(true); });
        socket.on('ai_audio_chunk', async (msg: { base64: string; mimeType: string }) => {
          // Decode each chunk to bytes to avoid base64 padding issues, then merge on done
          // If avatar voice is enabled, ignore legacy TTS chunks
          if (heygenEnabledRef.current) return;
          try {
            const bytes = Buffer.from(msg.base64, 'base64');
            ttsChunksRef.current.push(bytes);
          } catch {}
        });
        socket.on('ai_audio_done', () => {
          // force flush remaining audio immediately at turn end
          if (heygenEnabledRef.current) { return; }
          if (ttsFlushTimerRef.current) {
            clearTimeout(ttsFlushTimerRef.current);
            ttsFlushTimerRef.current = null;
          }
          flushTTSBuffer();
          setCanSpeak(true);
        });
        socket.on('done', () => {
          setIsDone(true);
          setFinishedMessage('Interview finished. Your answers have been saved.');
          cleanupStreaming();
        });
        socket.on('disconnect', () => {
          if (isDone) return;
          setIsDone(true);
          setFinishedMessage('Interview finished. Your answers have been saved.');
        });
        socket.on('error', (e: any) => Alert.alert('Error', e?.message || 'Connection error'));
        socket.on('tts', async (msg: { base64: string; mimeType: string }) => {
          // Non-realtime fallback chunks
          if (heygenEnabledRef.current) return; // ignore when avatar is used
          try {
            ttsChunksRef.current.push(Buffer.from(msg.base64, 'base64'));
          } catch {}
          if (!ttsFlushTimerRef.current) ttsFlushTimerRef.current = setTimeout(flushTTSBuffer, 600);
        });
        socket.on('clarify', (msg: { text: string }) => setQuestion(msg.text));
        // Do not auto-start; will start when user taps the button
      } catch (e) {
        Alert.alert('Audio Error', 'Failed to initialize microphone');
      }
    })();
    return () => {
      mounted = false;
      if (socketRef.current) socketRef.current.disconnect();
      cleanupStreaming();
    };
  }, [appointmentId]);

  const loadRequiredExams = async () => {
    try {
      setLoadingRequired(true);
      const res = await api.getAppointmentRequiredExams(appointmentId);
      if (res.success) setRequiredExams(res.data || []);
    } catch {}
    finally { setLoadingRequired(false); }
  };

  useEffect(() => {
    loadRequiredExams();
  }, [appointmentId]);

  useFocusEffect(
    React.useCallback(() => {
      loadRequiredExams();
      return () => {};
    }, [appointmentId])
  );

  // removed legacy sessionRef sync

  const flushPendingSpeaks = async () => {
    if (!avatarReadyRef.current) return;
    if (!pendingSpeakQueueRef.current.length) return;
    const items = pendingSpeakQueueRef.current.splice(0, pendingSpeakQueueRef.current.length);
    for (const t of items) {
      await speakViaPlayer(t);
    }
  };

  const speakViaPlayer = async (text: string) => {
    const normalized = String(text || '').trim();
    if (!normalized) return false;
    const now = Date.now();
    if (normalized === lastSpokenTextRef.current && now - lastSpeakAtRef.current < 2000) {
      setAvatarStatus('skipped duplicate');
      return true;
    }
    lastSpokenTextRef.current = normalized;
    lastSpeakAtRef.current = now;
    try {
      if (webSdkRef.current) {
        const script = `try{window.postMessage(JSON.stringify({type:'speak', text:${JSON.stringify(normalized)}}),'*')}catch{}; true;`;
        webSdkRef.current.injectJavaScript(script);
        setAvatarStatus('sent via player');
        return true;
      }
    } catch {}
    return false;
  };

  const speakToAvatar = async (text: string) => {
    const normalized = String(text || '').trim();
    if (!normalized) return false;
    const now = Date.now();
    if (normalized === lastSpokenTextRef.current && now - lastSpeakAtRef.current < 2000) {
      setAvatarStatus('skipped duplicate');
      return true;
    }
    lastSpokenTextRef.current = normalized;
    lastSpeakAtRef.current = now;

    // 1) Direct REST with session token + session_id (primary)
    try {
      const sid = avatarSessionIdRef.current;
      if (heygenToken && sid) {
        setAvatarStatus('sending task');
        const resp = await fetch('https://api.heygen.com/v1/streaming.task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${heygenToken}` },
          body: JSON.stringify({ session_id: sid, text: normalized, task_type: 'repeat', task_mode: 'sync' }),
        });
        const body = await resp.text();
        if (resp.ok) { setAvatarStatus('task ok'); return true; }
        setAvatarStatus(`task error ${resp.status} ${body.slice(0, 200)}`);
        // 1b) Fall back to backend proxy with API key
        try { const b = await api.sendHeygenTask(sid, normalized, 'sync', 'repeat'); if (b.success) { setAvatarStatus('task ok (backend)'); return true; } } catch {}
      }
    } catch (e: any) {
      setAvatarStatus(`task err ${e?.message || String(e)}`);
    }

    // 2) Fallback to in-player postMessage (mirrors sample Repeat)
    try {
      if (webSdkRef.current) {
        const script = `try{window.postMessage(JSON.stringify({type:'speak', text:${JSON.stringify(normalized)}}),'*')}catch{}; true;`;
        webSdkRef.current.injectJavaScript(script);
        return true;
      }
    } catch {}

    // 3) Final fallback to direct window.speak injection
    try {
      if (webSdkRef.current) {
        const js = `try{window.speak && window.speak(${JSON.stringify(normalized)})}catch{}; true;`;
        webSdkRef.current.injectJavaScript(js);
        return true;
      }
    } catch {}
    return false;
  };

  const flushTTSBuffer = async () => {
    const chunks = ttsChunksRef.current.splice(0, ttsChunksRef.current.length);
    ttsFlushTimerRef.current && clearTimeout(ttsFlushTimerRef.current);
    ttsFlushTimerRef.current = null;
    if (!chunks.length) return;
    // Merge bytes and re-encode once, producing a valid WAV file
    let merged = Buffer.concat(chunks);
    // If bytes are raw PCM and not a WAV container, wrap with WAV header (16-bit PCM, mono, 24kHz)
    const isWav = merged.length >= 4 && merged.slice(0, 4).toString('ascii') === 'RIFF';
    if (!isWav) {
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const dataSize = merged.length;
      const buffer = Buffer.alloc(44 + dataSize);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(36 + dataSize, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16); // PCM fmt chunk size
      buffer.writeUInt16LE(1, 20); // PCM format
      buffer.writeUInt16LE(numChannels, 22);
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(byteRate, 28);
      buffer.writeUInt16LE(blockAlign, 32);
      buffer.writeUInt16LE(bitsPerSample, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(dataSize, 40);
      merged.copy(buffer, 44);
      merged = buffer;
    }
    const base64 = merged.toString('base64');
    const uri = FileSystem.cacheDirectory + `ai_tts_${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    try {
      if (playerRef.current) { try { playerRef.current.pause(); } catch {}; try { playerRef.current.remove(); } catch {}; }
    } catch {}
    const player = Audio.createAudioPlayer({ uri }, 50);
    playerRef.current = player;
    isAssistantSpeakingRef.current = true;
    setAssistantSpeaking(true);
    player.play();
    // Estimate voice length: 24kHz * 2 bytes mono ≈ 48KB/s
    const estimatedMs = Math.max(1200, Math.min(8000, Math.floor((merged.length / 48000) * 1000) + 500));
    setTimeout(() => { isAssistantSpeakingRef.current = false; setAssistantSpeaking(false); }, estimatedMs);
  };

  const startRecording = async () => {
    try {
      if (!interviewStarted) {
        setInterviewStarted(true);
        socketRef.current?.emit('start', { appointmentId, procedureType });
        return; // user will press & hold to speak next
      }
      // After started, press-and-hold only
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const pressIn = async () => {
    // Prevent barge-in while AI is generating or avatar is speaking
    if (isAssistantSpeakingRef.current || awaitingAvatarTaskRef.current) {
      setCanSpeak(false);
      return;
    }
    setIsPressing(true);
    if (!interviewStarted) { return; }
    if (!recording) {
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecording(true);
        streamingRef.current = true;
      } catch (e) {}
    }
  };

  const pressOut = async () => {
    if (!recording) return;
    streamingRef.current = false;
    setIsPressing(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      let base64 = '';
      if (uri) {
        const resp = await fetch(uri);
        const buf = await resp.arrayBuffer();
        base64 = Buffer.from(buf).toString('base64');
      }
      // Avoid empty/very short turns that can cause duplicate assistant replies
      if (base64 && base64.length > 1500) {
        socketRef.current?.emit('audio_chunk', { base64, mimeType: 'audio/wav', isFinal: true });
      }
    } catch {}
    finally {
      setRecording(false);
    }
  };

  const stopAndSend = async () => {
    if (!recording) return;
    setIsSending(true);
    streamingRef.current = false;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const resp = await fetch(uri);
        const buf = await resp.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        socketRef.current?.emit('audio_chunk', { base64, mimeType: 'audio/m4a', isFinal: true });
      } else {
        socketRef.current?.emit('audio_chunk', { base64: '', mimeType: 'audio/m4a', isFinal: true });
      }
    } catch {}
    finally {
      setRecording(false);
      setIsSending(false);
    }
  };

  const cleanupStreaming = () => {
    streamingRef.current = false;
    ttsFlushTimerRef.current && clearTimeout(ttsFlushTimerRef.current);
    ttsFlushTimerRef.current = null;
    if (typeTimerRef.current) { clearInterval(typeTimerRef.current); typeTimerRef.current = null; }
  };

  const webHtmlForSession = (session: any) => {
    const safe = JSON.stringify(session || {});
    return `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/></head>
    <body style=\"margin:0;background:#000;color:#fff;font-family:sans-serif\">
      <video id=\"v\" autoplay playsinline style=\"width:100%;height:240px;background:#111\"></video>
      <div id=\"log\" style=\"font-size:12px;padding:8px;white-space:pre-wrap\"></div>
      <script>
        const SESSION = ${safe};
        const log = (...args) => { const el = document.getElementById('log'); el.textContent = [el.textContent, args.join(' ')].filter(Boolean).join('\\n').slice(0,4000); };
        const v = document.getElementById('v');
        const pc = new RTCPeerConnection({ iceServers: (SESSION.ice_servers2 || SESSION.ice_servers || []).map(s => ({ urls: s.urls, username: s.username, credential: s.credential })) });
        window._pc = pc;
        pc.ontrack = (ev) => { if (!v.srcObject) v.srcObject = ev.streams[0]; };
        let dc = null; let ws = null; let ready = false; const queue = [];
        try { dc = pc.createDataChannel('events'); window._dc = dc; dc.onopen = ()=>{ log('dc open'); ready=true; queue.splice(0).forEach(t=>sendText(t)); }; dc.onmessage = (e)=>log('dc msg', (e.data||'').toString().slice(0,128)); } catch(e){}
        const offer = SESSION.sdp && SESSION.sdp.sdp ? { type: 'offer', sdp: SESSION.sdp.sdp } : SESSION.sdp || { type: 'offer', sdp: '' };
        const sendText = (text) => { try { if (dc && dc.readyState === 'open') { dc.send(JSON.stringify({ type: 'input_text', text })); log('sent input_text (dc)'); return true; } if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: 'input_text', text })); log('sent input_text (ws)'); return true; } return false; } catch (e) { log('send err', e?.message||String(e)); return false; } };
        window._enqueueSpeak = (text) => { if (!sendText(text)) { queue.push(text); log('queued'); } };
        (async () => {
          try {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws = new WebSocket(SESSION.realtime_endpoint);
            window._ws = ws;
            ws.onopen = () => { ws.send(JSON.stringify({ type: 'client_description', sdp: pc.localDescription })); };
          } catch (e) { log('init err', e?.message || String(e)); }
        })();
      </script>
    </body></html>`;
  };

  const startInterviewFlow = async () => {
    if (step === 1) {
      setStep(2);
    }
    try {
      setPreparing(true);
      setCreatingSession(true);
      setAvatarStatus('fetching sdk token');
      const tk = await api.getHeygenToken();
      if (tk?.success && tk.data?.token) {
        setHeygenToken(tk.data.token);
        setAvatarStatus('sdk token ok');
        setAvatarReady(false); avatarReadyRef.current = false;
        heygenEnabledRef.current = true;
        try { if (playerRef.current) { playerRef.current.pause(); playerRef.current.remove(); } } catch {}
      } else {
        // Fallback: no avatar; continue with OpenAI-only
        heygenEnabledRef.current = false;
        setHeygenToken(null);
        setCreatingSession(false);
        await startRecording();
        setPreparing(false);
        return;
      }
      setCreatingSession(false);
      // Wait for HeyGen player readiness and session_id before starting interview
      setAvatarStatus('waiting for avatar ready + session id');
      const start = Date.now();
      const timeoutMs = 45000;
      while ((!avatarReadyRef.current || !avatarSessionIdRef.current) && Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 120));
      }
      if (!avatarReadyRef.current || !avatarSessionIdRef.current) {
        // Fallback on timeout: proceed without avatar
        heygenEnabledRef.current = false;
        setHeygenToken(null);
        await startRecording();
        setPreparing(false);
        return;
      }
      // Now start AI interview
      await startRecording();
      setPreparing(false);
    } catch (e: any) {
      setCreatingSession(false);
      setPreparing(false);
      // Fallback: proceed without avatar
      try { heygenEnabledRef.current = false; setHeygenToken(null); await startRecording(); } catch {}
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <>
            <View style={styles.header}>
              <View style={[styles.logo, styles.logoActive]}>
                <Ionicons name="sparkles" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Step 1: Upload Exams</Text>
              <Text style={styles.metaLabel}>Required for this appointment</Text>
            </View>
            {loadingRequired ? (
              <View style={styles.card}>
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.sm }} />
              </View>
            ) : (
              <>
                {(requiredExams || []).map((ex) => (
                  <View key={ex.id} style={[styles.card, { marginTop: SPACING.md }]}>
                    <Text style={styles.sectionTitle}>{ex.examTemplate?.name || 'Exam'}</Text>
                    {ex.extractedValues ? (
                      <View style={{ marginTop: SPACING.sm }}>
                        <Text style={styles.metaLabel}>Extracted values:</Text>
                        {Object.entries(ex.extractedValues || {}).map(([k,v]: any) => (
                          <Text key={String(k)} style={styles.metaValue}>{String(k)}: {String(v)}</Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.metaLabel}>Upload your exam</Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: SPACING.md }}>
                      <TouchableOpacity style={[styles.button, styles.uploadButton, { flex: 1 }]} onPress={() => navigation.navigate('UploadResult', { examId: ex.id })}>
                        <Ionicons name="cloud-upload" size={18} color={COLORS.primary} />
                        <Text style={styles.uploadButtonText}>Upload PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        ) : null}

        {step === 2 && !interviewStarted ? (
        <View style={styles.header}>
          <View style={[styles.logo, (assistantSpeaking || recording || isPressing) && styles.logoActive]}>
            <Ionicons name={assistantSpeaking ? 'pulse' : 'sparkles'} size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>AI Check-in</Text>
          {question ? <Text style={styles.question}>{question}</Text> : null}
          {/* Finished modal */}
          <Modal visible={isDone} animationType="fade" transparent onRequestClose={() => navigation.goBack()}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Ionicons name="checkmark-circle" size={56} color={COLORS.primary} />
                <Text style={styles.modalTitle}>All set!</Text>
                <Text style={styles.modalText}>{finishedMessage || 'Interview finished. Your answers have been saved.'}</Text>
                <TouchableOpacity style={[styles.button, styles.primary, styles.modalButton]} onPress={() => navigation.goBack()}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
        ) : null}

        {step === 2 && (interviewStarted || preparing) && !!heygenToken ? (
          <>
            <View style={styles.header}>
              <View style={[styles.logo, (assistantSpeaking || recording || isPressing) && styles.logoActive]}>
                <Ionicons name={assistantSpeaking ? 'pulse' : 'sparkles'} size={28} color={COLORS.primary} />
              </View>
              {question ? <Text style={styles.question}>{question}</Text> : null}
            </View>
            <View style={styles.card}>
              <View style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: '#000', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: '#111' }}>
              {heygenToken ? (
                <WebView
                ref={webSdkRef}
                source={{ uri: `${new URL(API_BASE_URL).origin}/api/v1/heygen/player?token=${encodeURIComponent(heygenToken)}&avatar=353846029b874ca0aa44eeb3cfb7b6f0` }}
                javaScriptEnabled
                originWhitelist={["*"]}
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                onMessage={async (e) => {
                  const m = e.nativeEvent.data || '';
                  // hide logs in UI; still consume session/readiness messages
                  if (/^session_id:/.test(m)) {
                    try { const sid = m.split(':')[1]; avatarSessionIdRef.current = sid; } catch {}
                  }
                  // Mark ready when sdk is ready, stream is ready, or unmuted/log lines arrive
                  if (/sdk ready|unmuted|video track|STREAM_READY/i.test(m)) {
                    setAvatarReady(true); avatarReadyRef.current = true; await flushPendingSpeaks();
                  }
                  // Avatar task lifecycle from player
                  if (/^TASK_OK:/i.test(m)) {
                    awaitingAvatarTaskRef.current = true;
                    setCanSpeak(false);
                    // Parse duration and start typewriter for pending text
                    try {
                      const dur = parseInt(String(m).split(':')[1] || '0', 10) || 0;
                      const text = pendingAssistantTextRef.current || '';
                      startTypewriter(text, dur);
                    } catch { setSyncedTranscript(pendingAssistantTextRef.current || ''); }
                  } else if (/^TASK_DONE$/i.test(m)) {
                    awaitingAvatarTaskRef.current = false;
                    setCanSpeak(true);
                    // Ensure full text visible and stop typewriter
                    if (typeTimerRef.current) { clearInterval(typeTimerRef.current); typeTimerRef.current = null; }
                    if (pendingAssistantTextRef.current) setSyncedTranscript(pendingAssistantTextRef.current);
                  } else if (/^TASK_ERROR:/i.test(m)) {
                    // Detach and continue with TTS-only
                    detachFromHeygen('task error');
                    setCanSpeak(true);
                    if (typeTimerRef.current) { clearInterval(typeTimerRef.current); typeTimerRef.current = null; }
                  } else if (/ws error|ws close|start err|create session err/i.test(m)) {
                    // Connection problem: detach
                    detachFromHeygen('connection');
                    setCanSpeak(true);
                  }
                  // If session id just arrived and avatar already ready, flush
                  if (/^session_id:/.test(m) && avatarReadyRef.current) {
                    await flushPendingSpeaks();
                  }
                }}
                onLoadStart={() => setAvatarStatus('player loadstart')}
                onLoadEnd={() => setAvatarStatus('player loadend')}
                onLoad={() => {
                  try {
                    webSdkRef.current?.injectJavaScript("window.ReactNativeWebView && window.ReactNativeWebView.postMessage('player inject ok'); true;");
                    // Pre-play gesture to satisfy autoplay on some devices
                    webSdkRef.current?.injectJavaScript("try{window.postMessage(JSON.stringify({type:'prepare'}),'*')}catch{}; true;");
                  } catch {}
                }}
                style={{ flex: 1, backgroundColor: '#000' }}
                />
              ) : null}
              </View>
            </View>
          </>
        ) : null}

        {step === 2 && interviewStarted && syncedTranscript ? (
          <View style={[styles.card, { marginTop: SPACING.md }] }>
            <Text style={styles.sectionTitle}>Assistant</Text>
            <View style={styles.transcriptBox}>
              <Text style={styles.transcript}>{syncedTranscript}</Text>
            </View>
          </View>
        ) : null}

        {step === 2 && !interviewStarted ? (
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={startInterviewFlow} disabled={isDone || isConnecting || creatingSession}>
            {creatingSession ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="play" size={20} color="#fff" />
            )}
            <Text style={styles.buttonText}>{creatingSession ? 'Starting…' : 'Start Interview'}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {step === 1 ? (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity style={[styles.button, styles.secondary, styles.floatingButton]} onPress={() => setStep(2)}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
            <Text style={styles.buttonText}>Continue to AI Check-in</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === 2 && interviewStarted ? (
      <View style={styles.micWrapFloating}>
        <Pressable
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={isDone || isConnecting || !interviewStarted || !canSpeak}
          style={({ pressed }) => [
            styles.micButton,
            (!interviewStarted || isConnecting || isDone || !canSpeak) ? styles.micDisabled : ((pressed || isPressing) ? styles.micPressed : styles.micIdle)
          ]}
        >
          <Ionicons name={isPressing ? 'mic' : 'mic-outline'} size={40} color={(!interviewStarted || isConnecting || isDone || !canSpeak) ? '#ccc' : '#fff'} />
        </Pressable>
        <Text style={styles.hint}>{
          !interviewStarted ? 'Tap Start Interview' : (!canSpeak ? 'Assistant speaking…' : (isPressing ? 'Release to send' : 'Hold to speak'))
        }</Text>
      </View>
      ) : null}

      {step === 2 && preparing ? (
        <View style={styles.overlay}> 
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary }}>Starting interview…</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, justifyContent: 'space-between' },
  scrollContent: { paddingBottom: SPACING.xl * 4 },
  header: { alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.sm },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  logoActive: { backgroundColor: '#E6F0FF' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  question: { fontSize: 16, color: COLORS.textSecondary, marginBottom: SPACING.xs, textAlign: 'center' },
  transcript: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  transcriptBox: { minHeight: 22 * 6, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  metaLabel: { fontSize: 12, color: COLORS.textSecondary },
  metaValue: { fontSize: 12, color: COLORS.text },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, alignSelf: 'center', width: '80%', marginTop: SPACING.md },
  primary: { backgroundColor: COLORS.primary },
  secondary: { backgroundColor: COLORS.accent },
  warning: { backgroundColor: COLORS.accent },
  uploadButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.primary },
  buttonText: { color: '#fff', fontSize: 16, marginLeft: SPACING.sm, fontWeight: '600' },
  uploadButtonText: { color: COLORS.primary, fontSize: 16, marginLeft: SPACING.sm, fontWeight: '600' },
  micWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  micWrapFloating: { position: 'absolute', left: 0, right: 0, bottom: SPACING.lg, alignItems: 'center' },
  floatingButtonContainer: { position: 'absolute', left: 0, right: 0, bottom: SPACING.xl, alignItems: 'center', paddingHorizontal: SPACING.lg },
  floatingButton: { width: '100%', marginTop: 0 },
  micButton: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  micIdle: { backgroundColor: COLORS.primary },
  micPressed: { backgroundColor: COLORS.accent },
  micDisabled: { backgroundColor: '#e0e0e0' },
  hint: { marginTop: SPACING.sm, color: COLORS.textSecondary },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,1)', alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  modalText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },
  modalButton: { width: '100%', marginTop: SPACING.sm },
});

export default AICheckInScreen;


