import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMp3Metadata } from "../hooks/use-mp3-metadata";

export default function MusicPlayer() {
  const [songs, setSongs] = useState<any[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [repeatMode, setRepeatMode] = useState<"off" | "one" | "all">("off");
  const [shuffled, setShuffled] = useState(false);

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const progressBarRef = useRef<View>(null);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "");

  const progress =
    status.duration > 0 ? (status.currentTime || 0) / status.duration : 0;

  async function pickSongs() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        multiple: true,
        copyToCacheDirectory: false, // Android: keeps content:// URI so expo-file-system can read it
      });
      if (!result.canceled && result.assets?.length > 0) {
        const newSongs = [...songs, ...result.assets];
        setSongs(newSongs);
        if (currentSongIndex === null) playSong(0, newSongs);
      }
    } catch {
      Alert.alert("Error", "Failed to pick songs");
    }
  }

  async function playSong(index: number, songList = songs) {
    if (index < 0 || index >= songList.length) return;
    const song = songList[index];
    setCurrentSongIndex(index);
    try {
      await player.replace({ uri: song.uri, name: song.name });
      await player.play();
    } catch {
      Alert.alert("Playback Error", "Could not play this file");
    }
  }

  function togglePlayback() {
    if (status.playing) {
      player.pause();
    } else if (currentSongIndex !== null) {
      player.play();
    }
  }

  const handleSeek = (locationX: number) => {
    progressBarRef.current?.measure((x, y, width) => {
      if (status.duration && width > 0) {
        const pct = Math.max(0, Math.min(1, locationX / width));
        player.seekTo(pct * status.duration);
      }
    });
  };

  function getNextIndex(): number {
    if (currentSongIndex === null || songs.length === 0) return 0;
    if (shuffled) {
      let next = Math.floor(Math.random() * songs.length);
      if (songs.length > 1 && next === currentSongIndex)
        next = (next + 1) % songs.length;
      return next;
    }
    const next = currentSongIndex + 1;
    if (next >= songs.length) return repeatMode === "all" ? 0 : -1;
    return next;
  }

  function playNext() {
    const next = getNextIndex();
    if (next >= 0) playSong(next);
    else { player.pause(); setCurrentSongIndex(null); }
  }

  function playPrevious() {
    if (currentSongIndex === null) return;
    const prev = currentSongIndex - 1;
    playSong(prev < 0 ? songs.length - 1 : prev);
  }

  useEffect(() => {
    if (status?.didJustFinish) {
      if (repeatMode === "one") {
        player.seekTo(0);
        player.play();
      } else {
        playNext();
      }
    }
  }, [status?.didJustFinish, repeatMode]);

  function removeSong(index: number) {
    const newSongs = songs.filter((_, i) => i !== index);
    setSongs(newSongs);
    if (currentSongIndex === index) {
      player.pause();
      setCurrentSongIndex(null);
    } else if (currentSongIndex !== null && currentSongIndex > index) {
      setCurrentSongIndex(currentSongIndex - 1);
    }
  }

  const currentSong =
    currentSongIndex !== null ? songs[currentSongIndex] : null;

  const repeatIcon =
    repeatMode === "one"
      ? "repeat-outline"
      : repeatMode === "all"
      ? "repeat"
      : "arrow-forward-outline";

  const { metadata: songMetadata } = useMp3Metadata(
    currentSong?.uri || null
  );

  return (
    <ImageBackground
      source={require("../../assets/images/bg.avif")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Music</Text>
          <Pressable style={styles.addBtn} onPress={pickSongs}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Songs</Text>
          </Pressable>
        </View>

        {currentSong ? (
          <View style={styles.nowPlaying}>
            <View style={styles.artwork}>
              {songMetadata?.coverArt ? (
                <Image
                  source={{ uri: `data:${songMetadata.mimeType || "image/jpeg"};base64,${songMetadata.coverArt}` }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 50 }]}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="musical-notes" size={48} color="rgba(255,255,255,0.2)" />
              )}
            </View>

            <Text style={styles.songTitle} numberOfLines={1}>
              {songMetadata?.title || stripExtension(currentSong.name)}
            </Text>
            <Text style={styles.songArtist}>
              {songMetadata?.artist || "Unknown Artist"}
            </Text>
            {songMetadata?.album && (
              <Text style={styles.songAlbum} numberOfLines={1}>
                {songMetadata.album}
              </Text>
            )}

            <View style={styles.progressRow}>
              <Text style={styles.timeText}>{formatTime(status.currentTime || 0)}</Text>
              <View ref={progressBarRef} style={styles.progressBarHit}>
                <Pressable
                  style={styles.progressBarHit}
                  onPress={(e) => handleSeek(e.nativeEvent.locationX)}
                >
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                    <View style={[styles.progressThumb, { left: `${Math.min(progress * 100, 96)}%` }]} />
                  </View>
                </Pressable>
              </View>
              <Text style={styles.timeText}>{formatTime(status.duration || 0)}</Text>
            </View>

            <View style={styles.controls}>
              <Pressable onPress={() => setShuffled((p) => !p)} style={styles.sideBtn}>
                <Ionicons name="shuffle" size={22} color={shuffled ? "#00cc2c" : "rgba(255,255,255,0.35)"} />
              </Pressable>
              <Pressable onPress={playPrevious} style={styles.controlBtn}>
                <Ionicons name="play-skip-back" size={26} color="#fff" />
              </Pressable>
              <Pressable onPress={togglePlayback} style={styles.playBtn}>
                <Ionicons name={status.playing ? "pause" : "play"} size={30} color="#fff" />
              </Pressable>
              <Pressable onPress={playNext} style={styles.controlBtn}>
                <Ionicons name="play-skip-forward" size={26} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setRepeatMode((p) => p === "off" ? "all" : p === "all" ? "one" : "off")}
                style={styles.sideBtn}
              >
                <Ionicons
                  name={repeatIcon}
                  size={22}
                  color={repeatMode !== "off" ? "#00cc2c" : "rgba(255,255,255,0.35)"}
                />
                {repeatMode === "one" && <Text style={styles.repeatOneLabel}>1</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyPlayer}>
            <Ionicons name="musical-notes-outline" size={56} color="rgba(255,255,255,0.12)" />
            <Text style={styles.emptyPlayerText}>No song playing</Text>
            <Text style={styles.emptyPlayerSub}>Tap "Add Songs" to get started</Text>
          </View>
        )}

        <View style={styles.playlistContainer}>
          <View style={styles.playlistHeaderRow}>
            <Text style={styles.playlistHeader}>Playlist</Text>
            <Text style={styles.playlistCount}>{songs.length} songs</Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.playlist}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {songs.length === 0 ? (
              <Text style={styles.emptyList}>Playlist is empty</Text>
            ) : (
              songs.map((song, index) => {
                const active = currentSongIndex === index;
                return (
                  <Pressable
                    key={`${song.uri}-${index}`}
                    style={[styles.songItem, active && styles.activeSong]}
                    onPress={() => playSong(index)}
                  >
                    <View style={styles.songIndexBox}>
                      {active && status.playing ? (
                        <Ionicons name="musical-note" size={14} color="#00cc2c" />
                      ) : (
                        <Text style={[styles.indexText, active && { color: "#00cc2c" }]}>
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.songText, active && styles.activeSongText]} numberOfLines={1}>
                      {stripExtension(song.name)}
                    </Text>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); removeSong(index); }}
                      hitSlop={12}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close" size={16} color="rgba(255,255,255,0.3)" />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.52)" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#00000093",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  nowPlaying: {
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  artwork: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  songTitle: { color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center", width: "100%" },
  songArtist: { color: "rgba(255,255,255,0.38)", fontSize: 13, marginTop: 3, marginBottom: 6 },
  songAlbum: { color: "rgba(255,255,255,0.28)", fontSize: 12, marginTop: 2, marginBottom: 12 },
  progressRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  progressBarHit: { flex: 1, height: 32, justifyContent: "center" },
  progressTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 2 },
  progressFill: { height: "100%", backgroundColor: "#00cc2c", borderRadius: 2 },
  progressThumb: {
    position: "absolute",
    width: 13,
    height: 13,
    backgroundColor: "#00cc2c",
    borderRadius: 7,
    top: -4.5,
    marginLeft: -6,
  },
  timeText: { color: "rgba(255,255,255,0.45)", fontSize: 11, minWidth: 34, textAlign: "center" },
  controls: { flexDirection: "row", alignItems: "center", gap: 18 },
  sideBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  controlBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  playBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#00cc2c",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00cc2c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  repeatOneLabel: {
    position: "absolute",
    bottom: 0,
    right: 0,
    color: "#00cc2c",
    fontSize: 9,
    fontWeight: "800",
  },
  emptyPlayer: {
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    paddingVertical: 36,
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  emptyPlayerText: { color: "rgba(255,255,255,0.45)", fontSize: 16, fontWeight: "600" },
  emptyPlayerSub: { color: "rgba(255,255,255,0.25)", fontSize: 13 },
  playlistContainer: { flex: 1, paddingHorizontal: 16 },
  playlistHeaderRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 },
  playlistHeader: { color: "#fff", fontSize: 18, fontWeight: "700" },
  playlistCount: { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  playlist: { flex: 1 },
  emptyList: { color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 40, fontSize: 15 },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 7,
    gap: 12,
  },
  activeSong: {
    backgroundColor: "rgba(0,204,44,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,204,44,0.2)",
  },
  songIndexBox: { width: 22, alignItems: "center" },
  indexText: { color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: "600" },
  songText: { color: "rgba(255,255,255,0.78)", fontSize: 14, flex: 1 },
  activeSongText: { color: "#00ff55", fontWeight: "600" },
  removeBtn: { padding: 4 },
});
