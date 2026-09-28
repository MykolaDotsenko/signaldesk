import { useCallback, useEffect, useRef, useState } from "react";

const VOLUME_KEY = "signaldesk:audio-volume";
const LAST_MODE_KEY = "signaldesk:audio-last-mode";
const MODES = new Set(["off", "ambient", "cinematic"]);

const clampVolume = (value) => Math.min(0.7, Math.max(0, Number(value) || 0));

const readSavedVolume = () => {
  if (typeof window === "undefined") return 0.34;

  try {
    const stored = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(stored) ? clampVolume(stored) : 0.34;
  } catch {
    return 0.34;
  }
};

const safeStop = (node) => {
  try {
    node.stop?.();
  } catch {
    // The source may already have ended.
  }

  try {
    node.disconnect?.();
  } catch {
    // The node may already be disconnected.
  }
};

export const useShipAudio = () => {
  const [mode, setModeState] = useState("off");
  const [volume, setVolumeState] = useState(readSavedVolume);
  const contextRef = useRef(null);
  const masterRef = useRef(null);
  const bedNodesRef = useRef(new Set());
  const cinematicTimerRef = useRef(null);
  const cinematicStepRef = useRef(0);
  const modeRef = useRef("off");
  const volumeRef = useRef(volume);

  const registerBedNode = useCallback((node) => {
    bedNodesRef.current.add(node);
    return node;
  }, []);

  const ensureContext = useCallback(async () => {
    if (typeof window === "undefined") return null;

    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = volumeRef.current;
      master.connect(context.destination);

      contextRef.current = context;
      masterRef.current = master;
    }

    if (contextRef.current.state === "suspended") {
      await contextRef.current.resume();
    }

    return contextRef.current;
  }, []);

  const stopBed = useCallback(() => {
    if (cinematicTimerRef.current) {
      window.clearInterval(cinematicTimerRef.current);
      cinematicTimerRef.current = null;
    }

    bedNodesRef.current.forEach(safeStop);
    bedNodesRef.current.clear();
  }, []);

  const connectOscillator = useCallback(
    (context, destination, { frequency, type = "sine", gain = 0.01, detune = 0 }) => {
      const oscillator = registerBedNode(context.createOscillator());
      const level = registerBedNode(context.createGain());

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      level.gain.value = gain;

      oscillator.connect(level);
      level.connect(destination);
      oscillator.start();

      return { oscillator, level };
    },
    [registerBedNode],
  );

  const startAmbientBed = useCallback(
    (context, intensity = 1) => {
      const master = masterRef.current;
      if (!master) return;

      const bedBus = registerBedNode(context.createGain());
      const lowpass = registerBedNode(context.createBiquadFilter());
      const lfo = registerBedNode(context.createOscillator());
      const lfoDepth = registerBedNode(context.createGain());

      bedBus.gain.value = 0.74 * intensity;
      lowpass.type = "lowpass";
      lowpass.frequency.value = 720;
      lowpass.Q.value = 0.7;

      bedBus.connect(lowpass);
      lowpass.connect(master);

      connectOscillator(context, bedBus, {
        frequency: 46.25,
        type: "sine",
        gain: 0.052,
      });
      connectOscillator(context, bedBus, {
        frequency: 69.3,
        type: "triangle",
        gain: 0.018,
        detune: -4,
      });
      connectOscillator(context, bedBus, {
        frequency: 92.5,
        type: "sine",
        gain: 0.009,
        detune: 5,
      });

      lfo.type = "sine";
      lfo.frequency.value = 0.11;
      lfoDepth.gain.value = 0.008 * intensity;
      lfo.connect(lfoDepth);
      lfoDepth.connect(bedBus.gain);
      lfo.start();

      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * 0.16;
      }

      const noise = registerBedNode(context.createBufferSource());
      const noiseFilter = registerBedNode(context.createBiquadFilter());
      const noiseGain = registerBedNode(context.createGain());

      noise.buffer = buffer;
      noise.loop = true;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 240;
      noiseFilter.Q.value = 0.55;
      noiseGain.gain.value = 0.013 * intensity;

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();
    },
    [connectOscillator, registerBedNode],
  );

  const triggerCinematicPhrase = useCallback(
    (context) => {
      const master = masterRef.current;
      if (!master) return;

      const progressions = [
        [73.42, 110.0, 146.83, 220.0],
        [87.31, 130.81, 174.61, 261.63],
        [65.41, 98.0, 130.81, 196.0],
        [98.0, 146.83, 196.0, 293.66],
      ];
      const chord = progressions[cinematicStepRef.current % progressions.length];
      cinematicStepRef.current += 1;

      const now = context.currentTime;
      const transientNodes = [];
      const trackTransient = (node) => {
        registerBedNode(node);
        transientNodes.push(node);
        return node;
      };

      const phraseBus = trackTransient(context.createGain());
      const filter = trackTransient(context.createBiquadFilter());

      phraseBus.gain.setValueAtTime(0.0001, now);
      phraseBus.gain.exponentialRampToValueAtTime(0.055, now + 1.15);
      phraseBus.gain.exponentialRampToValueAtTime(0.0001, now + 6.2);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(820, now);
      filter.frequency.linearRampToValueAtTime(1450, now + 2.2);
      filter.frequency.linearRampToValueAtTime(760, now + 6.2);

      phraseBus.connect(filter);
      filter.connect(master);

      chord.forEach((frequency, index) => {
        const oscillator = trackTransient(context.createOscillator());
        const voiceGain = trackTransient(context.createGain());

        oscillator.type = index === 0 ? "sawtooth" : "triangle";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = index % 2 === 0 ? -3 : 3;
        voiceGain.gain.value = index === 0 ? 0.16 : 0.1;

        oscillator.connect(voiceGain);
        voiceGain.connect(phraseBus);
        oscillator.start(now);
        oscillator.stop(now + 6.4);
      });

      const impact = trackTransient(context.createOscillator());
      const impactGain = trackTransient(context.createGain());
      impact.type = "sine";
      impact.frequency.setValueAtTime(58, now);
      impact.frequency.exponentialRampToValueAtTime(38, now + 0.8);
      impactGain.gain.setValueAtTime(0.07, now);
      impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      impact.connect(impactGain);
      impactGain.connect(master);
      impact.start(now);
      impact.stop(now + 1.2);

      window.setTimeout(() => {
        transientNodes.forEach((node) => {
          safeStop(node);
          bedNodesRef.current.delete(node);
        });
      }, 6800);
    },
    [registerBedNode],
  );

  const activateMode = useCallback(
    async (nextMode) => {
      const normalizedMode = MODES.has(nextMode) ? nextMode : "off";

      stopBed();
      modeRef.current = normalizedMode;
      setModeState(normalizedMode);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LAST_MODE_KEY, normalizedMode);
        } catch {
          // Audio preferences are optional; blocked storage must not break playback.
        }
      }

      if (normalizedMode === "off") return;

      const context = await ensureContext();
      if (!context) {
        modeRef.current = "off";
        setModeState("off");
        return;
      }

      startAmbientBed(context, normalizedMode === "cinematic" ? 0.78 : 1);

      if (normalizedMode === "cinematic") {
        triggerCinematicPhrase(context);
        cinematicTimerRef.current = window.setInterval(() => {
          if (context.state === "running") triggerCinematicPhrase(context);
        }, 7600);
      }
    },
    [ensureContext, startAmbientBed, stopBed, triggerCinematicPhrase],
  );

  const setVolume = useCallback((nextValue) => {
    const normalized = clampVolume(nextValue);
    volumeRef.current = normalized;
    setVolumeState(normalized);

    if (masterRef.current) {
      masterRef.current.gain.setTargetAtTime(
        normalized,
        contextRef.current?.currentTime ?? 0,
        0.03,
      );
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VOLUME_KEY, String(normalized));
      } catch {
        // Volume still applies for the current session.
      }
    }
  }, []);

  const playCue = useCallback(
    async (kind = "confirm") => {
      if (modeRef.current === "off") return;

      const context = await ensureContext();
      const master = masterRef.current;
      if (!context || !master) return;

      const tones = {
        confirm: [640, 880],
        navigate: [520],
        pin: [720, 960],
        favorite: [880, 1174],
        delete: [240, 180],
        undo: [392, 587],
        restore: [523, 784, 1047],
        error: [196, 155],
      };
      const frequencies = tones[kind] ?? tones.confirm;
      const now = context.currentTime;

      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + index * 0.055;
        const end = start + 0.18;

        oscillator.type = kind === "error" || kind === "delete" ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.055, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
      });
    },
    [ensureContext],
  );

  useEffect(() => {
    return () => {
      stopBed();
      contextRef.current?.close?.();
    };
  }, [stopBed]);

  return {
    mode,
    volume,
    activateMode,
    setVolume,
    playCue,
  };
};
