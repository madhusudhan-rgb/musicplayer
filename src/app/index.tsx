import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Dimensions, Image, Pressable,
  ScrollView, StatusBar, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMp3Metadata } from "../hooks/use-mp3-metadata";

type Song = { uri: string; name: string };
type Repeat = "off" | "all" | "one";

const { width: SW } = Dimensions.get("window");
const ART_SIZE = SW - 48;
const G = "#1DB954";

function fmt(s: number) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function noExt(n: string) {
  return n.replace(/\.[^/.]+$/, "");
}

export default function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [idx, setIdx] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [shuffle, setShuffle] = useState(false);

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const barRef = useRef<View>(null);

  const song = idx !== null ? songs[idx] : null;
  const { metadata } = useMp3Metadata(song?.uri ?? null);
  const progress = status.duration > 0 ? (status.currentTime ?? 0) / status.duration : 0;

  useEffect(() => { SplashScreen.hideAsync(); }, []);

  useEffect(() => {
    if (!status.didJustFinish) return;
    if (repeat === "one") { player.seekTo(0); player.play(); }
    else next();
  }, [status.didJustFinish]);

  async function pickSongs() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const added: Song[] = res.assets.map(a => ({ uri: a.uri, name: a.name }));
      const merged = [...songs, ...added];
      setSongs(merged);
      if (idx === null) play(0, merged);
    } catch {
      Alert.alert("Error", "Could not import songs");
    }
  }

  async function play(i: number, list = songs) {
    if (i < 0 || i >= list.length) return;
    setIdx(i);
    try {
      await player.replace({ uri: list[i].uri, name: list[i].name });
      await player.play();
    } catch {
      Alert.alert("Playback Error", "Could not play this file");
    }
  }

  function next() {
    if (idx === null || !songs.length) return;
    if (shuffle) {
      let n = Math.floor(Math.random() * songs.length);
      if (songs.length > 1 && n === idx) n = (n + 1) % songs.length;
      play(n);
      return;
    }
    const n = idx + 1;
    if (n >= songs.length) {
      if (repeat === "all") play(0);
      else { player.pause(); setIdx(null); }
    } else play(n);
  }

  function prev() {
    if (idx === null) return;
    if (status.currentTime && status.currentTime > 3) { player.seekTo(0); return; }
    play(idx === 0 ? songs.length - 1 : idx - 1);
  }

  function seek(x: number) {
    barRef.current?.measure((_a, _b, w) => {
      if (!status.duration || w <= 0) return;
      player.seekTo(Math.max(0, Math.min(1, x / w)) * status.duration);
    });
  }

  function remove(i: number) {
    const updated = songs.filter((_, j) => j !== i);
    setSongs(updated);
    if (idx === i) { player.pause(); setIdx(null); }
    else if (idx !== null && idx > i) setIdx(idx - 1);
  }

  const cover = metadata?.coverArt
    ? `data:${metadata.mimeType ?? "image/jpeg"};base64,${metadata.coverArt}`
    : null;
  const title = metadata?.title ?? (song ? noExt(song.name) : null);
  const artist = metadata?.artist ?? (song ? "Unknown Artist" : null);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={s.safe}>

        <View style={s.header}>
          <View style={{ width: 36 }} />
          <Text style={s.headerLabel}>NOW PLAYING</Text>
          <Pressable onPress={pickSongs} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={26} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          bounces
        >
          <View style={s.artContainer}>
            {cover ? (
              <Image source={{ uri: cover }} style={s.art} resizeMode="cover" />
            ) : (
              <View style={[s.art, s.artPlaceholder]}>
                {song
                  ? <Ionicons name="musical-notes" size={72} color="rgba(255,255,255,0.08)" />
                  : <View style={s.noSongInner}>
                      <Ionicons name="musical-notes-outline" size={44} color="rgba(255,255,255,0.12)" />
                      <Text style={s.noSongText}>No songs yet</Text>
                      <Pressable style={s.importBtn} onPress={pickSongs}>
                        <Text style={s.importBtnText}>Import songs</Text>
                      </Pressable>
                    </View>
                }
              </View>
            )}
          </View>

          <View style={s.infoRow}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={s.songTitle} numberOfLines={1}>
                {title ?? "—"}
              </Text>
              <Text style={s.songArtist} numberOfLines={1}>
                {artist ?? "Add songs to start"}
              </Text>
              {metadata?.album ? (
                <Text style={s.songAlbum} numberOfLines={1}>{metadata.album}</Text>
              ) : null}
            </View>
            <Pressable hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={22} color="rgba(255,255,255,0.35)" />
            </Pressable>
          </View>

          <View style={s.seekArea}>
            <View ref={barRef} style={s.seekHit}>
              <Pressable onPress={e => seek(e.nativeEvent.locationX)} style={s.seekHit}>
                <View style={s.seekTrack}>
                  <View style={[s.seekFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
                </View>
                <View style={[s.seekThumb, { left: `${Math.min(progress * 100, 97.5)}%` as any }]} />
              </Pressable>
            </View>
            <View style={s.seekTimes}>
              <Text style={s.seekTime}>{fmt(status.currentTime ?? 0)}</Text>
              <Text style={s.seekTime}>{fmt(status.duration ?? 0)}</Text>
            </View>
          </View>

          <View style={s.controls}>
            <Pressable onPress={() => setShuffle(v => !v)} hitSlop={12} style={s.ctrlSmall}>
              <Ionicons name="shuffle" size={21} color={shuffle ? G : "rgba(255,255,255,0.35)"} />
              {shuffle && <View style={s.dot} />}
            </Pressable>

            <Pressable onPress={prev} hitSlop={8} style={s.ctrlMid}>
              <Ionicons name="play-skip-back" size={30} color={song ? "#fff" : "rgba(255,255,255,0.2)"} />
            </Pressable>

            <Pressable
              style={[s.playBtn, !song && s.playBtnDisabled]}
              onPress={() => song && (status.playing ? player.pause() : player.play())}
            >
              <Ionicons
                name={status.playing ? "pause" : "play"}
                size={30}
                color={song ? "#000" : "rgba(0,0,0,0.3)"}
                style={!status.playing && { marginLeft: 3 }}
              />
            </Pressable>

            <Pressable onPress={next} hitSlop={8} style={s.ctrlMid}>
              <Ionicons name="play-skip-forward" size={30} color={song ? "#fff" : "rgba(255,255,255,0.2)"} />
            </Pressable>

            <Pressable
              onPress={() => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off")}
              hitSlop={12}
              style={s.ctrlSmall}
            >
              <Ionicons
                name={repeat === "off" ? "repeat" : repeat === "all" ? "repeat" : "repeat-outline"}
                size={21}
                color={repeat !== "off" ? G : "rgba(255,255,255,0.35)"}
              />
              {repeat !== "off" && <View style={s.dot} />}
              {repeat === "one" && <Text style={s.repeatOne}>1</Text>}
            </Pressable>
          </View>

          {songs.length > 0 && (
            <View style={s.queueWrap}>
              <View style={s.queueTop}>
                <Text style={s.queueLabel}>Queue</Text>
                <Text style={s.queueMeta}>{songs.length} songs</Text>
              </View>
              {songs.map((item, i) => {
                const active = idx === i;
                return (
                  <Pressable
                    key={`${item.uri}-${i}`}
                    style={({ pressed }) => [s.queueRow, pressed && { opacity: 0.6 }]}
                    onPress={() => play(i)}
                  >
                    <View style={s.queueIndex}>
                      {active && status.playing
                        ? <Ionicons name="volume-high" size={13} color={G} />
                        : <Text style={[s.queueNum, active && { color: G }]}>{i + 1}</Text>
                      }
                    </View>
                    <Text
                      style={[s.queueName, active && s.queueNameActive]}
                      numberOfLines={1}
                    >
                      {noExt(item.name)}
                    </Text>
                    <Pressable
                      onPress={e => { e.stopPropagation(); remove(i); }}
                      hitSlop={14}
                      style={({ pressed }) => [{ opacity: pressed ? 0.4 : 1 }]}
                    >
                      <Ionicons name="close" size={16} color="rgba(255,255,255,0.2)" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },

  artContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  art: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 12,
  },
  artPlaceholder: {
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
  },
  noSongInner: { alignItems: "center", gap: 12 },
  noSongText: { color: "rgba(255,255,255,0.25)", fontSize: 15 },
  importBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 24,
    marginTop: 4,
  },
  importBtnText: { color: "#000", fontSize: 14, fontWeight: "700" },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  songTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 4,
  },
  songArtist: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    fontWeight: "500",
  },
  songAlbum: {
    color: "rgba(255,255,255,0.28)",
    fontSize: 12,
    marginTop: 3,
  },

  seekArea: { paddingHorizontal: 24, marginBottom: 16 },
  seekHit: { height: 30, justifyContent: "center", position: "relative" },
  seekTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    overflow: "hidden",
  },
  seekFill: {
    height: "100%",
    backgroundColor: G,
    borderRadius: 2,
  },
  seekThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: "#fff",
    borderRadius: 7,
    top: 8,
    marginLeft: -7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  seekTimes: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  seekTime: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontWeight: "600",
  },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  ctrlSmall: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  ctrlMid: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  playBtnDisabled: { backgroundColor: "rgba(255,255,255,0.15)" },
  dot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: G,
  },
  repeatOne: {
    position: "absolute",
    top: 0,
    right: 0,
    color: G,
    fontSize: 8,
    fontWeight: "900",
  },

  queueWrap: { paddingHorizontal: 24 },
  queueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  queueLabel: { color: "#fff", fontSize: 17, fontWeight: "700" },
  queueMeta: { color: "rgba(255,255,255,0.3)", fontSize: 12 },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  queueIndex: { width: 18, alignItems: "center" },
  queueNum: { color: "rgba(255,255,255,0.25)", fontSize: 13, fontWeight: "600" },
  queueName: { flex: 1, color: "rgba(255,255,255,0.65)", fontSize: 14 },
  queueNameActive: { color: G, fontWeight: "600" },
});
