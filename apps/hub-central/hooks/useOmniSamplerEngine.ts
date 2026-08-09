import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { StudioTrack } from '../store/studioStore';

export function useOmniSamplerEngine(tracks: StudioTrack[], isPlaying: boolean, bpm: number) {
  const playersRef = useRef<Map<number, Tone.Player>>(new Map());

  // Mise à jour du BPM global
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Gestion de la lecture / transport
  useEffect(() => {
    const managePlayback = async () => {
      await Tone.start();

      if (isPlaying) {
        // Nettoyage et chargement des players pour chaque piste active
        playersRef.current.forEach((player) => player.dispose());
        playersRef.current.clear();

        for (const track of tracks) {
          if (!track.sampleUrl || track.isLocked) continue;

          try {
            const player = new Tone.Player({
              url: track.sampleUrl,
              loop: true,
              volume: Tone.gainToDb(track.isMuted ? 0 : track.volume),
            }).toDestination();

            await player.load(track.sampleUrl);
            playersRef.current.set(track.id, player);
            player.start(0);
          } catch (err) {
            console.error(`🔥 Erreur de lecture sur la piste ${track.id}:`, err);
          }
        }

        Tone.Transport.start();
      } else {
        Tone.Transport.stop();
        playersRef.current.forEach((player) => player.stop().dispose());
        playersRef.current.clear();
      }
    };

    managePlayback();

    return () => {
      Tone.Transport.stop();
      playersRef.current.forEach((player) => player.dispose());
      playersRef.current.clear();
    };
  }, [isPlaying, tracks]);

  // Gestion en temps réel du volume et du mute sans couper le son
  useEffect(() => {
    tracks.forEach((track) => {
      const player = playersRef.current.get(track.id);
      if (player) {
        player.volume.value = Tone.gainToDb(track.isMuted ? 0 : track.volume);
      }
    });
  }, [tracks]);
}