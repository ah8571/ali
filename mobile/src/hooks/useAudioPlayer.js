import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

/**
 * Reusable audio player hook for saved reader audio / recordings.
 *
 * @param {object|null} entry — { id, uri } of the track to control.
 *        Pass null or a new entry to switch tracks (previous unloads automatically).
 * @returns {{
 *   isLoaded: boolean,
 *   isPlaying: boolean,
 *   positionMillis: number,
 *   durationMillis: number,
 *   togglePlayback: () => Promise<void>,
 *   seekTo: (ms: number) => Promise<void>,
 *   jumpForward: (ms?: number) => Promise<void>,
 *   jumpBack: (ms?: number) => Promise<void>,
 *   stop: () => Promise<void>,
 * }}
 */
const useAudioPlayer = (entry) => {
  const soundRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);

  const unloadCurrent = useCallback(async () => {
    const sound = soundRef.current;
    if (sound) {
      try { await sound.stopAsync(); } catch {}
      try { await sound.unloadAsync(); } catch {}
      soundRef.current = null;
    }
    setIsLoaded(false);
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);
  }, []);

  const stop = useCallback(async () => {
    await unloadCurrent();
  }, [unloadCurrent]);

  // Load a new entry whenever it changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!entry?.uri) {
        await unloadCurrent();
        return;
      }

      await unloadCurrent();
      if (cancelled) return;

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: entry.uri },
          { shouldPlay: false },
          (status) => {
            if (!status.isLoaded) {
              if (status.error) {
                setIsLoaded(false);
                setIsPlaying(false);
                setPositionMillis(0);
                setDurationMillis(0);
              }
              return;
            }

            setPositionMillis(Number(status.positionMillis || 0));
            setDurationMillis(Number(status.durationMillis || 0));
            setIsPlaying(Boolean(status.isPlaying));

            if (status.didJustFinish) {
              setIsPlaying(false);
              setPositionMillis(Number(status.durationMillis || 0));
            }
          }
        );

        if (cancelled) {
          sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setIsLoaded(true);
          setDurationMillis(Number(status.durationMillis || 0));
        }
      } catch (error) {
        console.error('[useAudioPlayer] Load failed:', error?.message);
        if (!cancelled) {
          setIsLoaded(false);
          setIsPlaying(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      unloadCurrent();
    };
  }, [entry?.id, entry?.uri]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayback = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      if (status.isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Toggle failed:', error?.message);
    }
  }, [isLoaded]);

  const seekTo = useCallback(async (ms) => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;
    try {
      await sound.setPositionAsync(Math.max(0, Math.min(ms, durationMillis)));
    } catch (error) {
      console.error('[useAudioPlayer] Seek failed:', error?.message);
    }
  }, [isLoaded, durationMillis]);

  const jumpForward = useCallback(async (ms = 15000) => {
    await seekTo(positionMillis + ms);
  }, [seekTo, positionMillis]);

  const jumpBack = useCallback(async (ms = 15000) => {
    await seekTo(positionMillis - ms);
  }, [seekTo, positionMillis]);

  return {
    isLoaded,
    isPlaying,
    positionMillis,
    durationMillis,
    togglePlayback,
    seekTo,
    jumpForward,
    jumpBack,
    stop,
  };
};

export default useAudioPlayer;
