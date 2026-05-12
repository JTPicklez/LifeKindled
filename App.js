import { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList, Alert, StatusBar, Modal, Switch,
  Animated, LayoutAnimation, AccessibilityInfo, Slider,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import { Svg as SvgComponent, Path, Circle, Ellipse, G } from 'react-native-svg';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, signInWithCredential, GoogleAuthProvider,
  onAuthStateChanged, signOut, createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, collection,
  addDoc, query, where, onSnapshot, orderBy,
  updateDoc, arrayUnion, serverTimestamp, getDocs, deleteDoc,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

const firebaseConfig = {
  apiKey: 'AIzaSyBIEaSc8_jOUKtf37VnV3XXSMTiBcsJODQ',
  authDomain: 'life-kindled.firebaseapp.com',
  projectId: 'life-kindled',
  storageBucket: 'life-kindled.firebasestorage.app',
  messagingSenderId: '792279814972',
  appId: '1:792279814972:web:67e297a8ecd3e63fc90439',
};

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') console.warn('Persistence failed: multiple tabs open');
  else if (err.code === 'unimplemented') console.warn('Persistence not supported');
});

const GOOGLE_CLIENT_ID = '792279814972-t1pflrb540ldama7bq6q38hacgiv5kdo.apps.googleusercontent.com';

// ─── AVATARS ─────────────────────────────────────────────
const AVATARS = [
  { id: 'flame', emoji: '🔥', label: 'Flame' },
  { id: 'dove', emoji: '🕊️', label: 'Dove' },
  { id: 'cross', emoji: '✝️', label: 'Cross' },
  { id: 'church', emoji: '⛪', label: 'Church' },
  { id: 'bible', emoji: '📖', label: 'Bible' },
  { id: 'prayer', emoji: '🙏', label: 'Prayer' },
  { id: 'lamb', emoji: '🐑', label: 'Lamb' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'olive', emoji: '🌿', label: 'Olive Branch' },
  { id: 'candle', emoji: '🕯️', label: 'Candle' },
];

// ─── THEME ───────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:         '#0A0A12',
    card:       '#12111E',
    cardAlt:    '#1A1826',
    cardBorder: '#1E1E30',
    accent:     '#F5A623',
    soft:       '#E07B39',
    text:       '#EDE8DF',
    muted:      '#88889A',
    dim:        '#44445A',
    ultraDim:   '#1E1E30',
    ok:         '#4CAF82',
    danger:     '#E05555',
    purple:     '#8B5CF6',
    inputBg:    '#12111E',
  },
  light: {
    bg:         '#F5F3EF',
    card:       '#FFFFFF',
    cardAlt:    '#F0EDE8',
    cardBorder: '#E5E1DA',
    accent:     '#D4921A',
    soft:       '#C4702A',
    text:       '#1A1A2E',
    muted:      '#6B6B7B',
    dim:        '#9999AA',
    ultraDim:   '#E5E1DA',
    ok:         '#3D9B6C',
    danger:     '#C44444',
    purple:     '#7A4DE0',
    inputBg:    '#FFFFFF',
  }
};

// ─── SETTINGS CONTEXT ────────────────────────────────────
const SettingsContext = createContext();

function SettingsProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(15);
  const [serifMode, setSerifMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('lk_settings').then(raw => {
      if (raw) {
        const s = JSON.parse(raw);
        if (s.theme) setTheme(s.theme);
        if (s.fontSize) setFontSize(s.fontSize);
        if (s.serifMode !== undefined) setSerifMode(s.serifMode);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem('lk_settings', JSON.stringify({ theme, fontSize, serifMode }));
    }
  }, [theme, fontSize, serifMode, loaded]);

  const C = THEMES[theme];

  return (
    <SettingsContext.Provider value={{ theme, setTheme, fontSize, setFontSize, serifMode, setSerifMode, C, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

function useSettings() {
  return useContext(SettingsContext);
}

// ─── BIBLE API ───────────────────────────────────────────
const BIBLE_API = 'https://bible-api.com';
const TRANSLATIONS = ['kjv', 'web'];
const TRANSLATION_LABELS = { kjv: 'KJV', web: 'WEB' };
const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
];

const HIGHLIGHT_COLORS = [
  { color: '#F5A623', label: 'Gold'   },
  { color: '#4CAF82', label: 'Green'  },
  { color: '#5B8AF5', label: 'Blue'   },
  { color: '#8B5CF6', label: 'Purple' },
  { color: '#E07B39', label: 'Ember'  },
];

async function fetchPassage(reference, translation = 'web') {
  try {
    const encoded = encodeURIComponent(reference);
    const res = await fetch(`${BIBLE_API}/${encoded}?translation=${translation}`);
    return await res.json();
  } catch { return null; }
}

// ─── HELPERS ─────────────────────────────────────────────
function generateCode() {
  const words = ['KINDLE','FLAME','LIGHT','GRACE','FAITH','TRUTH','HOPE','RISEN'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function timeAgo(timestamp) {
  if (!timestamp?.toDate) return '';
  const diff = (Date.now() - timestamp.toDate().getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function verseRef(book, chapter, verseNum) {
  return `${book}_${chapter}_${verseNum}`;
}

function calculateStreak(days) {
  if (!days?.length) return 0;
  const sorted = [...days].sort((a, b) => b.day - a.day);
  let streak = 0;
  for (const d of sorted) {
    if (d.done) streak++;
    else break;
  }
  return streak;
}

function getAvatar(avatarId) {
  return AVATARS.find(a => a.id === avatarId) || AVATARS[0];
}

// ─── BURNING BUSH LOGO (FIXED) ──────────────────────────
function BurningBushLogo({ size = 72 }) {
  const s = size;
  const arms = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <SvgComponent width={s} height={s} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill="#0D0D1A" />
      {arms.map(angle => (
        <Path key={`b${angle}`} d="M49,50 L49,34 L51,34 L51,50 Z" fill="#5C3A1E" origin="50,50" rotation={angle} />
      ))}
      {arms.map(angle => (
        <Ellipse key={`l${angle}`} cx="50" cy="27" rx="5" ry="8" fill="#3D6B3A" origin="50,50" rotation={angle} />
      ))}
      {arms.map(angle => (
        <Path key={`fo${angle}`} d="M46,28 C44,22 41,18 50,11 C59,18 56,22 54,28 Z" fill="#E07B39" origin="50,50" rotation={angle} />
      ))}
      {arms.map(angle => (
        <Path key={`fm${angle}`} d="M47.5,28 C46,23 43.5,19 50,13 C56.5,19 54,23 52.5,28 Z" fill="#F5A623" origin="50,50" rotation={angle} />
      ))}
      {arms.map(angle => (
        <Path key={`fi${angle}`} d="M49,28 C48,24 46.5,20 50,15 C53.5,20 52,24 51,28 Z" fill="#FFF0B3" origin="50,50" rotation={angle} />
      ))}
      {[22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5].map(angle => (
        <Circle key={`d${angle}`} cx="50" cy="36" r="1.5" fill="#F5A623" fillOpacity="0.65" origin="50,50" rotation={angle} />
      ))}
      <Circle cx="50" cy="50" r="5" fill="#3D6B3A" />
      <Circle cx="50" cy="50" r="3" fill="#F5A623" />
      <Circle cx="50" cy="50" r="1.5" fill="#FFF0B3" />
    </SvgComponent>
  );
}

// ─── SHARED COMPONENTS ───────────────────────────────────
function GoldButton({ label, onPress, outline, style, loading: btnLoading }) {
  const { C } = useSettings();
  if (outline) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles(C).outlineBtn, style]} disabled={btnLoading} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={styles(C).outlineBtnText}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} style={style} activeOpacity={0.85} disabled={btnLoading} accessibilityRole="button" accessibilityLabel={label}>
      <LinearGradient colors={[C.accent, C.soft]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={styles(C).goldBtn}>
        {btnLoading
          ? <ActivityIndicator color={C.bg} size="small" />
          : <Text style={styles(C).goldBtnText}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ScreenWrapper({ children, scroll }) {
  const { C } = useSettings();
  if (scroll) {
    return (
      <SafeAreaView style={styles(C).safe} edges={['top']}>
        <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingBottom:48 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return <SafeAreaView style={styles(C).safe} edges={['top']}>{children}</SafeAreaView>;
}

function EmptyState({ icon, title, subtitle }) {
  const { C } = useSettings();
  return (
    <View style={styles(C).emptyWrap}>
      <Text style={styles(C).emptyIcon}>{icon}</Text>
      <Text style={styles(C).emptyTitle}>{title}</Text>
      <Text style={styles(C).emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function PageHeader({ title, subtitle, onBack }) {
  const { C } = useSettings();
  return (
    <View style={{ marginTop:16, marginBottom:8 }}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={{ marginBottom:8 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={{ color:C.accent, fontFamily:'Nunito_700Bold', fontSize:14 }}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles(C).pageTitle}>{title}</Text>
      <View style={styles(C).decorRule} />
      {subtitle ? <Text style={[styles(C).mutedText, { marginTop:8 }]}>{subtitle}</Text> : null}
    </View>
  );
}

function SectionLabel({ children }) {
  const { C } = useSettings();
  return (
    <View style={styles(C).sectionRow}>
      <View style={styles(C).sectionBar} />
      <Text style={styles(C).sectionText}>{children}</Text>
    </View>
  );
}

function SkeletonLine({ width = '100%', height = 14, style }) {
  const { C } = useSettings();
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={[{ width, height, borderRadius:6, backgroundColor:C.cardAlt }, style, { opacity }]} />
  );
}

function BibleSkeleton() {
  return (
    <View style={{ padding:24, gap:16 }}>
      <SkeletonLine width="60%" height={18} />
      <SkeletonLine width="90%" />
      <SkeletonLine width="85%" />
      <SkeletonLine width="95%" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="88%" />
      <SkeletonLine width="70%" />
      <SkeletonLine width="92%" />
    </View>
  );
}

// ─── AVATAR PICKER MODAL ─────────────────────────────────
function AvatarPicker({ visible, currentAvatar, onSelect, onClose }) {
  const { C } = useSettings();
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles(C).modalOverlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close avatar picker" />
      <View style={[styles(C).highlightSheet, { paddingBottom: 40 }]}>
        <Text style={[styles(C).modalVerseRef, { marginBottom: 16 }]}>Choose Your Avatar</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          {AVATARS.map(a => (
            <TouchableOpacity
              key={a.id}
              onPress={() => onSelect(a.id)}
              style={[{
                width: 64, height: 64, borderRadius: 16,
                backgroundColor: currentAvatar === a.id ? `${C.accent}22` : C.cardAlt,
                borderWidth: 2,
                borderColor: currentAvatar === a.id ? C.accent : C.cardBorder,
                alignItems: 'center', justifyContent: 'center',
              }]}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
              {currentAvatar === a.id && (
                <View style={{ position: 'absolute', bottom: -6, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Nunito_800ExtraBold', color: C.bg }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={onClose} style={[styles(C).outlineBtn, { marginTop: 24 }]} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={styles(C).outlineBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── HIGHLIGHT COLOR PICKER ──────────────────────────────
function HighlightPicker({ visible, verse, book, chapter, user, currentColor, onSelect, onClear, onClose }) {
  const { C } = useSettings();
  if (!visible || !verse) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles(C).modalOverlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close highlight picker" />
      <View style={styles(C).highlightSheet}>
        <Text style={[styles(C).modalVerseRef, { marginBottom:4 }]}>{book} {chapter}:{verse.verse}</Text>
        <Text style={[styles(C).mutedText, { fontStyle:'italic', marginBottom:16 }]} numberOfLines={2}>{verse.text?.trim()}</Text>
        <Text style={styles(C).inputLabel}>Choose Highlight Color</Text>
        <View style={{ flexDirection:'row', gap:12, marginTop:10, justifyContent:'center' }}>
          {HIGHLIGHT_COLORS.map(h => (
            <TouchableOpacity key={h.color} onPress={() => onSelect(verse, h.color)} style={[styles(C).colorDot, { backgroundColor:h.color, borderWidth: currentColor === h.color ? 3 : 0, borderColor:'white' }]} accessibilityRole="button" accessibilityLabel={`Select ${h.label} highlight`}>
              {currentColor === h.color && <Text style={{ color:'white', fontSize:14 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection:'row', gap:10, marginTop:20 }}>
          {currentColor && (
            <TouchableOpacity onPress={() => onClear(verse)} style={[styles(C).outlineBtn, { flex:1, borderColor:C.danger }]} accessibilityRole="button" accessibilityLabel="Remove highlight">
              <Text style={[styles(C).outlineBtnText, { color:C.danger }]}>Remove</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={[styles(C).outlineBtn, { flex:1 }]} accessibilityRole="button" accessibilityLabel="Done">
            <Text style={styles(C).outlineBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── ANNOTATION MODAL (WITH COLOR) ───────────────────────
function AnnotationModal({ visible, verse, book, chapter, user, onClose }) {
  const { C } = useSettings();
  const [text, setText] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(null);
  const [isPastorNote, setIsPastorNote] = useState(false);
  const [noteColor, setNoteColor] = useState(HIGHLIGHT_COLORS[0].color);
  const isLeader = user?.role === 'admin' || user?.role === 'leader';
  const ref = verse ? verseRef(book, chapter, verse.verse) : null;

  useEffect(() => {
    if (!visible || !ref || !user) return;
    const load = async () => {
      try {
        const d = await getDoc(doc(db, 'annotations', `${user.uid}_${ref}`));
        if (d.exists()) {
          const data = d.data();
          setText(data.text || ''); setIsPublic(data.isPublic || false); setExisting(data);
          setNoteColor(data.color || HIGHLIGHT_COLORS[0].color);
        } else { setText(''); setIsPublic(false); setExisting(null); setNoteColor(HIGHLIGHT_COLORS[0].color); }
        if (isLeader) {
          const pn = await getDoc(doc(db, 'pastorNotes', `${user.groupId}_${ref}`));
          setIsPastorNote(pn.exists());
        }
      } catch {}
    };
    load();
  }, [visible, ref]);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'annotations', `${user.uid}_${ref}`), {
        userId: user.uid, userName: user.name, role: user.role,
        groupId: user.groupId, verseRef: ref, book, chapter,
        verseNum: verse.verse, verseText: verse.text?.trim(),
        text: text.trim(), isPublic, color: noteColor,
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch { Alert.alert('Error', 'Could not save annotation.'); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!existing) return;
    try { await deleteDoc(doc(db, 'annotations', `${user.uid}_${ref}`)); onClose(); }
    catch { Alert.alert('Error', 'Could not delete.'); }
  }

  async function handleSavePastorNote() {
    if (!text.trim() || !isLeader) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'pastorNotes', `${user.groupId}_${ref}`), {
        text: text.trim(), authorName: user.name, groupId: user.groupId,
        verseRef: ref, book, chapter, verseNum: verse?.verse,
        verseText: verse?.text?.trim(), createdAt: serverTimestamp(),
      });
      Alert.alert('Pastor Note saved', 'Members will see this note on this passage.');
      onClose();
    } catch { Alert.alert('Error', 'Could not save pastor note.'); }
    setSaving(false);
  }

  if (!visible || !verse) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles(C).modalOverlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close annotation modal" />
        <View style={styles(C).modalSheet}>
          <View style={{ marginBottom:16 }}>
            <Text style={styles(C).modalVerseRef}>{book} {chapter}:{verse.verse}</Text>
            <Text style={[styles(C).mutedText, { fontStyle:'italic', marginTop:4 }]} numberOfLines={2}>{verse.text?.trim()}</Text>
          </View>

          <Text style={styles(C).inputLabel}>Note Color</Text>
          <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
            {HIGHLIGHT_COLORS.map(h => (
              <TouchableOpacity key={h.color} onPress={() => setNoteColor(h.color)} style={[styles(C).colorDot, { backgroundColor:h.color, borderWidth: noteColor === h.color ? 3 : 0, borderColor:'white' }]} accessibilityRole="button" accessibilityLabel={h.label}>
                {noteColor === h.color && <Text style={{ color:'white', fontSize:12 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles(C).inputLabel}>Your Note</Text>
          <TextInput
            value={text} onChangeText={setText}
            placeholder="Write your thoughts on this verse..."
            placeholderTextColor={C.dim}
            style={[styles(C).input, { minHeight:80, textAlignVertical:'top', marginBottom:16 }]}
            multiline autoFocus
          />
          <View style={styles(C).toggleRow}>
            <View>
              <Text style={[styles(C).blockTitle, { fontSize:13 }]}>Share with group</Text>
              <Text style={styles(C).mutedText}>Others can see this annotation</Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false:C.cardBorder, true:`${C.accent}88` }} thumbColor={isPublic ? C.accent : C.dim} />
          </View>
          {isLeader && (
            <View style={[styles(C).toggleRow, { marginTop:8 }]}>
              <View>
                <Text style={[styles(C).blockTitle, { fontSize:13 }]}>Pin as Pastor's Note</Text>
                <Text style={styles(C).mutedText}>Pinned for all members on this passage</Text>
              </View>
              <Switch value={isPastorNote} onValueChange={setIsPastorNote} trackColor={{ false:C.cardBorder, true:`${C.purple}88` }} thumbColor={isPastorNote ? C.purple : C.dim} />
            </View>
          )}
          <View style={{ flexDirection:'row', gap:10, marginTop:20 }}>
            {existing && (
              <TouchableOpacity onPress={handleDelete} style={[styles(C).outlineBtn, { flex:1, borderColor:C.danger }]} accessibilityRole="button" accessibilityLabel="Delete note">
                <Text style={[styles(C).outlineBtnText, { color:C.danger }]}>Delete</Text>
              </TouchableOpacity>
            )}
            <GoldButton
              label={isPastorNote ? "Save as Pastor's Note" : "Save Note"}
              onPress={isPastorNote ? handleSavePastorNote : handleSave}
              loading={saving} style={{ flex:2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────
const NAV_TABS = [
  { id:'home',       icon:'home', label:'Home' },
  { id:'bible',      icon:'book', label:'Bible' },
  { id:'plan',       icon:'calendar', label:'Plan' },
  { id:'discussion', icon:'chatbubbles', label:'Discuss' },
  { id:'profile',    icon:'person', label:'Profile' },
];

function BottomNav({ active, onNav, unreadCount }) {
  const { C } = useSettings();
  return (
    <View style={styles(C).bottomNav}>
      {NAV_TABS.map(t => (
        <TouchableOpacity key={t.id} onPress={() => onNav(t.id)} style={styles(C).navTab} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: active === t.id }}>
          <View style={[styles(C).navDot, active===t.id && styles(C).navDotOn]} />
          <View style={{ position:'relative' }}>
            <Ionicons name={t.icon} size={22} color={active===t.id ? C.accent : C.dim} />
            {t.id === 'discussion' && unreadCount > 0 && (
              <View style={styles(C).badge}>
                <Text style={styles(C).badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles(C).navLabel, active===t.id && { color:C.accent, fontFamily:'Nunito_800ExtraBold' }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── SIGN IN ─────────────────────────────────────────────
function SignInScreen() {
  const { C } = useSettings();
  const [mode, setMode] = useState('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.';

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const state = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, Math.random().toString());
      const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=profile%20email&state=${state}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success') {
        const params = new URLSearchParams(result.url.split('#')[1]);
        const accessToken = params.get('access_token');
        const credential = GoogleAuthProvider.credential(null, accessToken);
        await signInWithCredential(auth, credential);
      }
    } catch { Alert.alert('Sign in failed', 'Please try again or use email instead.'); }
    setLoading(false);
  }

  async function handleEmailAuth() {
    if (!email || !password) { Alert.alert('Missing info', 'Please enter your email and password.'); return; }
    if (password.length < 6) { Alert.alert('Password too short', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (isNewAccount) {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert("Account created", "Welcome! Let's get you set up.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      const msg =
        e.code === 'auth/user-not-found' ? 'No account found with that email.' :
        e.code === 'auth/wrong-password' ? 'Incorrect password.' :
        e.code === 'auth/email-already-in-use' ? 'An account already exists with that email.' :
        e.code === 'auth/invalid-email' ? 'Please enter a valid email address.' :
        e.code === 'auth/invalid-credential' ? 'Incorrect email or password.' :
        e.code === 'auth/weak-password' ? 'Password is too weak. Try mixing letters and numbers.' :
        e.code === 'auth/network-request-failed' ? 'Network error. Check your connection.' :
        'Sign in failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'email') {
    return (
      <View style={[styles(C).safe, styles(C).centerPad]}>
        <View style={styles(C).splashGlow} />
        <TouchableOpacity onPress={() => setMode('main')} style={{ position:'absolute', top:60, left:24 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={{ color:C.accent, fontFamily:'Nunito_700Bold', fontSize:14 }}>← Back</Text>
        </TouchableOpacity>
        <BurningBushLogo size={64} />
        <Text style={[styles(C).splashTitle, { marginTop:16 }]}>LifeKindled</Text>
        <View style={[styles(C).decorRule, { alignSelf:'center' }]} />
        <View style={{ width:'100%', marginTop:32, gap:12 }}>
          <View style={styles(C).authToggle}>
            <TouchableOpacity onPress={() => setIsNewAccount(false)} style={[styles(C).authToggleTab, !isNewAccount && styles(C).authToggleTabOn]} accessibilityRole="button" accessibilityLabel="Sign in tab">
              <Text style={[styles(C).authToggleText, !isNewAccount && { color:C.bg }]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsNewAccount(true)} style={[styles(C).authToggleTab, isNewAccount && styles(C).authToggleTabOn]} accessibilityRole="button" accessibilityLabel="Create account tab">
              <Text style={[styles(C).authToggleText, isNewAccount && { color:C.bg }]}>Create Account</Text>
            </TouchableOpacity>
          </View>
          <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={C.dim} keyboardType="email-address" autoCapitalize="none" style={styles(C).input} accessibilityLabel="Email input" />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password (min 6 characters)" placeholderTextColor={C.dim} secureTextEntry style={styles(C).input} accessibilityLabel="Password input" />
          <GoldButton label={isNewAccount ? 'Create Account' : 'Sign In'} onPress={handleEmailAuth} loading={loading} style={{ marginTop:4 }} />
        </View>
        <Text style={styles(C).splashGreeting}>{greeting}</Text>
      </View>
    );
  }

  return (
    <View style={[styles(C).safe, styles(C).centerPad]}>
      <View style={styles(C).splashGlow} />
      <BurningBushLogo size={80} />
      <View style={{ alignItems:'center', marginTop:20 }}>
        <Text style={styles(C).splashTitle}>LifeKindled</Text>
        <View style={[styles(C).decorRule, { alignSelf:'center' }]} />
        <Text style={styles(C).splashTagline}>Ignite your faith with community</Text>
      </View>
      <View style={{ width:'100%', gap:12, marginTop:40 }}>
        <GoldButton label="Continue with Google" onPress={handleGoogleSignIn} loading={loading} />
        <View style={styles(C).orRow}>
          <View style={styles(C).orLine} />
          <Text style={styles(C).orText}>or</Text>
          <View style={styles(C).orLine} />
        </View>
        <TouchableOpacity onPress={() => setMode('email')} style={styles(C).emailBtn} accessibilityRole="button" accessibilityLabel="Continue with email">
          <Text style={styles(C).emailBtnText}>Continue with Email</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles(C).splashGreeting}>{greeting}</Text>
    </View>
  );
}

// ─── WHO ARE YOU ─────────────────────────────────────────
function WhoAreYouScreen({ onLeader, onMember }) {
  const { C } = useSettings();
  return (
    <ScreenWrapper scroll>
      <View style={styles(C).pad}>
        <PageHeader title={'Who are you?'} subtitle="This shapes your experience" />
        <TouchableOpacity onPress={onLeader} style={[styles(C).roleCard, { borderColor:C.accent }]} accessibilityRole="button" accessibilityLabel="I am a leader">
          <View style={[styles(C).roleIcon, { backgroundColor:`${C.accent}18` }]}><Text style={{ fontSize:24 }}>✝️</Text></View>
          <View style={{ flex:1 }}>
            <Text style={styles(C).roleTitle}>I am a Leader</Text>
            <Text style={styles(C).roleSub}>Create or manage your group</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onMember} style={[styles(C).roleCard, { borderColor:C.cardBorder, marginTop:0 }]} accessibilityRole="button" accessibilityLabel="I am a member">
          <View style={[styles(C).roleIcon, { backgroundColor:C.cardAlt }]}><Text style={{ fontSize:24 }}>🤝</Text></View>
          <View style={{ flex:1 }}>
            <Text style={styles(C).roleTitle}>I am a Member</Text>
            <Text style={styles(C).roleSub}>Join with an invite code</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.dim} />
        </TouchableOpacity>
        <View style={styles(C).divider} />
        <Text style={[styles(C).sectionText, { marginBottom:12 }]}>LEADER OPTIONS</Text>
        {['Create a new group', 'Join as existing leader'].map(o => (
          <TouchableOpacity key={o} onPress={onLeader} style={styles(C).textRow} accessibilityRole="button">
            <Text style={{ color:C.accent, fontSize:14, marginRight:12 }}>+</Text>
            <Text style={styles(C).textRowLabel}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScreenWrapper>
  );
}

// ─── LEADER CREATE ───────────────────────────────────────
function LeaderCreateScreen({ firebaseUser, onDone, onBack }) {
  const { C } = useSettings();
  const currentUser = firebaseUser || auth.currentUser;
  const [groupName, setGroupName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [leaderName, setLeaderName] = useState(currentUser?.displayName || '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!currentUser) { Alert.alert('Error', 'Not signed in. Please go back and sign in again.'); return; }
    if (!groupName || !leaderName || !pin) { Alert.alert('Missing info', 'Please fill out all fields.'); return; }
    setLoading(true);
    try {
      const code = generateCode();
      const groupRef = doc(collection(db, 'groups'));
      await setDoc(groupRef, {
        id: groupRef.id, name: groupName, churchName,
        inviteCode: code, leaderPin: pin,
        adminUID: currentUser.uid, createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid, name: leaderName,
        email: currentUser.email || '', role: 'admin',
        groupId: groupRef.id, canEditPlan: true,
        avatarId: 'flame',
        createdAt: serverTimestamp(),
      });
      Alert.alert("Group Created!", `Your invite code is:\n\n${code}\n\nShare this with your members.`, [
        { text: 'Got it', onPress: () => onDone({ uid: currentUser.uid, groupId: groupRef.id, name: leaderName, role: 'admin', canEditPlan: true, avatarId: 'flame' }) }
      ]);
    } catch (e) { Alert.alert('Error', 'Could not create group. ' + e.message); }
    setLoading(false);
  }

  return (
    <ScreenWrapper scroll>
      <View style={styles(C).pad}>
        <PageHeader title={'Create Your Group'} subtitle="You will be the group admin" onBack={onBack} />
        {[
          { label:'Group Name', value:groupName, set:setGroupName, placeholder:'e.g. LifeStudents' },
          { label:'Church Name', value:churchName, set:setChurchName, placeholder:'e.g. Life Family Church' },
          { label:'Your Name', value:leaderName, set:setLeaderName, placeholder:'Your name' },
          { label:'Leader PIN', value:pin, set:setPin, placeholder:'PIN for other leaders', secure:true },
        ].map(f => (
          <View key={f.label} style={{ marginBottom:16 }}>
            <Text style={styles(C).inputLabel}>{f.label}</Text>
            <TextInput value={f.value} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={C.dim} secureTextEntry={!!f.secure} style={styles(C).input} accessibilityLabel={f.label} />
          </View>
        ))}
        <View style={styles(C).infoBox}>
          <Text style={styles(C).infoText}>Your invite code is auto-generated — share it with members after creating</Text>
        </View>
        <GoldButton label="Create Group" onPress={handleCreate} style={{ marginTop:12 }} loading={loading} />
      </View>
    </ScreenWrapper>
  );
}

// ─── MEMBER JOIN ─────────────────────────────────────────
function MemberCodeScreen({ firebaseUser, onDone, onBack }) {
  const { C } = useSettings();
  const currentUser = firebaseUser || auth.currentUser;
  const [code, setCode] = useState('');
  const [name, setName] = useState(currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!currentUser) { Alert.alert('Error', 'Not signed in. Please go back and sign in again.'); return; }
    if (!code || !name) { Alert.alert('Missing info', 'Enter your name and invite code.'); return; }
    setLoading(true);
    try {
      const q = query(collection(db, 'groups'), where('inviteCode', '==', code.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) { Alert.alert('Invalid code', 'Check with your leader.'); setLoading(false); return; }
      const groupDoc = snap.docs[0];
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid, name, email: currentUser.email || '',
        role: 'member', groupId: groupDoc.id, canEditPlan: false,
        avatarId: 'dove',
        createdAt: serverTimestamp(),
      });
      onDone({ uid: currentUser.uid, groupId: groupDoc.id, name, role: 'member', canEditPlan: false, avatarId: 'dove' });
    } catch (e) { Alert.alert('Error', 'Could not join group. ' + e.message); }
    setLoading(false);
  }

  return (
    <ScreenWrapper scroll>
      <View style={[styles(C).pad, { alignItems:'center', paddingTop:24 }]}>
        <PageHeader title={'Enter Your Group Code'} subtitle="Get this from your group leader" onBack={onBack} />
        <View style={{ width:'100%', marginBottom:16 }}>
          <Text style={styles(C).inputLabel}>Your Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Marcus" placeholderTextColor={C.dim} style={styles(C).input} accessibilityLabel="Your name" />
        </View>
        <TextInput value={code} onChangeText={t => setCode(t.toUpperCase())} placeholder="KINDLE-4829" placeholderTextColor={C.dim} autoCapitalize="characters" style={styles(C).codeInput} accessibilityLabel="Invite code" />
        <GoldButton label="Join Group" onPress={handleJoin} style={{ marginTop:24, width:'100%' }} loading={loading} />
        <Text style={[styles(C).mutedText, { marginTop:16 }]}>Wrong code? Check with your leader</Text>
      </View>
    </ScreenWrapper>
  );
}

// ─── HOME ────────────────────────────────────────────────
function HomeScreen({ onNav, user, activePlan, onPlanUpdated }) {
  const { C, fontSize } = useSettings();
  const today = activePlan?.days?.find(d => d.today);
  const completed = activePlan?.days?.filter(d => d.done)?.length || 0;
  const total = activePlan?.days?.length || 0;
  const streak = calculateStreak(activePlan?.days);
  const avatar = getAvatar(user?.avatarId);

  function parsePassage(passage) {
    if (!passage) return { book:'', ref:'' };
    const parts = passage.split(' ');
    if (parts[0].match(/^\d+$/) && parts.length > 2) return { book:`${parts[0]} ${parts[1]}`, ref:parts.slice(2).join(' ') };
    return { book:parts[0], ref:parts.slice(1).join(' ') };
  }

  const parsed = parsePassage(today?.passage);

  async function markTodayDone() {
    if (!today || !activePlan?.id) return;
    const updatedDays = activePlan.days.map(d => d.id === today.id ? { ...d, done: !today.done } : d);
    try {
      await updateDoc(doc(db, 'readingPlans', activePlan.id), { days: updatedDays });
      onPlanUpdated({ ...activePlan, days: updatedDays });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('Error', 'Could not update.'); }
  }

  return (
    <ScreenWrapper scroll>
      <View style={styles(C).pad}>
        <View style={[styles(C).row, { marginTop:12 }]}>
          <View style={{ flex:1 }}>
            <Text style={styles(C).greeting}>{getGreeting()}</Text>
            <Text style={[styles(C).homeName, { fontSize: 34 + (fontSize - 15) * 0.5 }]}>{user?.name || 'Welcome'}.</Text>
          </View>
          <View style={styles(C).homeAvatar}>
            <Text style={{ fontSize: 22 }}>{avatar.emoji}</Text>
          </View>
        </View>
        <View style={styles(C).decorRule} />

        <View style={[styles(C).readingCard, { marginTop:24 }]}>
          {today && <Text style={styles(C).ghostNum}>{parsed.ref.split(':')[0]}</Text>}
          <SectionLabel>{today ? `Today's Reading · Day ${today.day}` : "Today's Reading"}</SectionLabel>
          {today ? (
            <View style={{ marginTop:10 }}>
              <Text style={styles(C).passageBook}>{parsed.book}</Text>
              <Text style={[styles(C).passageRef, { fontSize: 36 + (fontSize - 15) * 1.2 }]}>{parsed.ref}</Text>
              {today.description ? <Text style={styles(C).passageDesc}>{today.description}</Text> : null}
              {streak > 0 && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:8 }}>
                  <Text style={{ fontSize:13 }}>🔥</Text>
                  <Text style={[styles(C).mutedText, { color:C.accent }]}>{streak} day streak</Text>
                </View>
              )}
              <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
                <GoldButton label="Read" onPress={() => onNav('bible')} style={{ flex:1 }} />
                <TouchableOpacity onPress={markTodayDone} style={[styles(C).doneBtn, today.done && styles(C).doneBtnActive]} accessibilityRole="button" accessibilityLabel={today.done ? 'Mark as not done' : 'Mark as done'}>
                  <Text style={[styles(C).doneBtnText, today.done && { color:C.bg }]}>{today.done ? '✓ Done' : 'Mark Done'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <EmptyState icon="📖" title="No plan yet" subtitle="Your leader has not created a reading plan yet" />
          )}
        </View>

        {activePlan && total > 0 && (
          <View style={[styles(C).leftBlock, { marginTop:24 }]}>
            <View style={[styles(C).row, { marginBottom:10 }]}>
              <Text style={styles(C).blockTitle}>{activePlan.title}</Text>
              <Text style={styles(C).mutedText}>Wk {Math.ceil((completed + 1) / 7)}/{activePlan.weeks}</Text>
            </View>
            <View style={{ flexDirection:'row', gap:3 }}>
              {Array.from({ length: Math.min(total, 14) }, (_, i) => (
                <View key={i} style={[styles(C).progressSeg, { backgroundColor: i < completed ? C.accent : C.ultraDim }]} />
              ))}
            </View>
            <Text style={[styles(C).mutedText, { marginTop:6 }]}>{completed} of {total} days complete</Text>
          </View>
        )}

        <View style={styles(C).divider} />

        <View style={{ marginTop:20 }}>
          <Text style={styles(C).sectionText}>FROM THE GROUP</Text>
          {today ? (
            <View style={styles(C).discussPreview}>
              <Text style={[styles(C).mutedText, { fontStyle:'italic', marginBottom:12 }]}>
                {today.prompts?.length > 0 ? `"${today.prompts[0]}"` : 'What stood out to you today?'}
              </Text>
              <GoldButton label="Join the Conversation" onPress={() => onNav('discussion')} outline />
            </View>
          ) : (
            <EmptyState icon="💬" title="No discussions yet" subtitle="Be the first to share when a plan is ready" />
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}

// ─── BIBLE ───────────────────────────────────────────────
function BibleScreen({ user }) {
  const { C, fontSize, serifMode, setSerifMode } = useSettings();
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState('3');
  const [translation, setTranslation] = useState('web');
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState({});
  const [showBooks, setShowBooks] = useState(false);
  const [annotationMode, setAnnotationMode] = useState('mine');
  const [annotations, setAnnotations] = useState([]);
  const [groupAnnotations, setGroupAnnotations] = useState([]);
  const [pastorNote, setPastorNote] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [verseAnims, setVerseAnims] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'highlights'), where('userId', '==', user.uid), where('book', '==', book), where('chapter', '==', chapter));
    const unsub = onSnapshot(q, snap => {
      const h = {};
      snap.docs.forEach(d => { const data = d.data(); h[data.verseNum] = data.color; });
      setHighlights(h);
    });
    return unsub;
  }, [book, chapter, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'annotations'), where('userId', '==', user.uid), where('book', '==', book), where('chapter', '==', chapter));
    const unsub = onSnapshot(q, snap => { setAnnotations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [book, chapter, user?.uid]);

  useEffect(() => {
    if (!user?.groupId) return;
    const q = query(collection(db, 'annotations'), where('groupId', '==', user.groupId), where('book', '==', book), where('chapter', '==', chapter), where('isPublic', '==', true));
    const unsub = onSnapshot(q, snap => { setGroupAnnotations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [book, chapter, user?.groupId]);

  useEffect(() => {
    if (!user?.groupId) return;
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'pastorNotes'), where('groupId', '==', user.groupId), where('book', '==', book), where('chapter', '==', chapter)));
        setPastorNote(!snap.empty ? snap.docs[0].data() : null);
      } catch {}
    };
    load();
  }, [book, chapter, user?.groupId]);

  useEffect(() => { loadPassage(); }, [translation]);

  async function loadPassage() {
    setLoading(true); setVerses([]);
    const data = await fetchPassage(`${book} ${chapter}`, translation);
    if (data?.verses) {
      setVerses(data.verses);
      const anims = data.verses.map(() => new Animated.Value(0));
      setVerseAnims(anims);
      anims.forEach((anim, i) => {
        Animated.timing(anim, { toValue: 1, duration: 300, delay: i * 30, useNativeDriver: true }).start();
      });
    }
    else Alert.alert('Error', 'Could not load passage. Check your connection.');
    setLoading(false);
  }

  async function saveHighlight(verse, color) {
    if (!user?.uid) return;
    const ref = verseRef(book, chapter, verse.verse);
    const id = `${user.uid}_${ref}`;
    try {
      await setDoc(doc(db, 'highlights', id), {
        userId: user.uid, groupId: user.groupId,
        book, chapter, verseNum: verse.verse,
        verseText: verse.text?.trim(), color,
        createdAt: serverTimestamp(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('Error', 'Could not save highlight.'); }
    setShowHighlightPicker(false);
  }

  async function clearHighlight(verse) {
    if (!user?.uid) return;
    const ref = verseRef(book, chapter, verse.verse);
    const id = `${user.uid}_${ref}`;
    try { await deleteDoc(doc(db, 'highlights', id)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
    catch { Alert.alert('Error', 'Could not remove highlight.'); }
    setShowHighlightPicker(false);
  }

  const activeAnnotations = annotationMode === 'mine' ? annotations : groupAnnotations;
  const annotatedVerses = new Set(activeAnnotations.map(a => a.verseNum));

  return (
    <SafeAreaView style={styles(C).safe} edges={['top']}>
      <View style={styles(C).bibleHeader}>
        <View style={styles(C).row}>
          <View>
            <Text style={styles(C).bibleBookSm}>{book}</Text>
            <Text style={[styles(C).bibleChBig, { fontSize: 40 + (fontSize - 15) * 1.5 }]}>{chapter}</Text>
          </View>
          <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
            {TRANSLATIONS.map(t => (
              <TouchableOpacity key={t} onPress={() => setTranslation(t)} style={[styles(C).pill, translation===t && styles(C).pillOn]} accessibilityRole="button" accessibilityLabel={`${TRANSLATION_LABELS[t]} translation`}>
                <Text style={[styles(C).pillText, translation===t && { color:C.bg }]}>{TRANSLATION_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={[styles(C).row, { marginTop:12, gap:8 }]}>
          <TouchableOpacity onPress={() => setShowBooks(!showBooks)} style={[styles(C).pickerPill, { flex:1 }]} accessibilityRole="button" accessibilityLabel="Select book">
            <Text style={{ color:C.text, fontFamily:'Nunito_400Regular', fontSize:13 }}>{book} ▾</Text>
          </TouchableOpacity>
          <TextInput value={chapter} onChangeText={setChapter} onSubmitEditing={loadPassage} keyboardType="number-pad" returnKeyType="go" style={styles(C).chInput} placeholder="Ch." placeholderTextColor={C.dim} accessibilityLabel="Chapter number" />
          <TouchableOpacity onPress={loadPassage} style={[styles(C).pickerPill, { borderColor:C.accent, backgroundColor:`${C.accent}15` }]} accessibilityRole="button" accessibilityLabel="Load passage">
            <Text style={{ color:C.accent, fontFamily:'Nunito_700Bold', fontSize:13 }}>Go</Text>
          </TouchableOpacity>
        </View>
        {showBooks && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:10 }}>
            {BOOKS.map(b => (
              <TouchableOpacity key={b} onPress={() => { setBook(b); setShowBooks(false); }} style={[styles(C).pill, book===b && styles(C).pillOn, { marginRight:6 }]} accessibilityRole="button" accessibilityLabel={b}>
                <Text style={[styles(C).pillText, book===b && { color:C.bg }]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles(C).annotToggleRow}>
          <TouchableOpacity onPress={() => setAnnotationMode('mine')} style={[styles(C).annotTab, annotationMode==='mine' && styles(C).annotTabOn]} accessibilityRole="button" accessibilityLabel="My notes">
            <Text style={[styles(C).annotTabText, annotationMode==='mine' && { color:C.bg }]}>My Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAnnotationMode('group')} style={[styles(C).annotTab, annotationMode==='group' && styles(C).annotTabOn]} accessibilityRole="button" accessibilityLabel="Group notes">
            <Text style={[styles(C).annotTabText, annotationMode==='group' && { color:C.bg }]}>Group Notes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex:1, backgroundColor:C.bg }}>
          <BibleSkeleton />
        </View>
      ) : (
        <ScrollView style={{ flex:1, backgroundColor:C.bg }} contentContainerStyle={{ padding:24, paddingTop:12 }} showsVerticalScrollIndicator={false}>
          {pastorNote && (
            <View style={styles(C).pastorNoteCard}>
              <View style={styles(C).sectionRow}>
                <Text style={{ fontSize:12 }}>✝️</Text>
                <Text style={[styles(C).sectionText, { color:C.purple }]}>PASTOR'S NOTE</Text>
              </View>
              <Text style={[styles(C).bodyText, { fontStyle:'italic', marginTop:6 }]}>{pastorNote.text}</Text>
              <Text style={[styles(C).mutedText, { marginTop:4 }]}>— {pastorNote.authorName}</Text>
            </View>
          )}
          {verses.map((v, idx) => {
            const hlColor = highlights[v.verse];
            const hasAnnotation = annotatedVerses.has(v.verse);
            const verseAnnotations = activeAnnotations.filter(a => a.verseNum === v.verse);
            const anim = verseAnims[idx] || new Animated.Value(1);
            return (
              <View key={v.verse}>
                <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[10,0] }) }] }}>
                  <TouchableOpacity
                    onPress={() => { setSelectedVerse(v); setShowAnnotationModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    onLongPress={() => { setSelectedVerse(v); setShowHighlightPicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                    style={[styles(C).verseRow, hlColor && { backgroundColor:`${hlColor}18`, borderLeftColor:hlColor }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Verse ${v.verse}`}
                    delayLongPress={350}
                  >
                    <View style={{ alignItems:'center', gap:4 }}>
                      <Text style={[styles(C).verseNum, hlColor && { color:hlColor }]}>{v.verse}</Text>
                      {hasAnnotation && <View style={styles(C).annotDot} />}
                      {hlColor && <View style={[styles(C).hlDot, { backgroundColor:hlColor }]} />}
                    </View>
                    <Text style={[styles(C).verseText, serifMode && { fontFamily:'PlayfairDisplay_400Regular_Italic' }, { fontSize: fontSize, lineHeight: fontSize * 1.8 }]}>{v.text.trim()}</Text>
                  </TouchableOpacity>
                </Animated.View>
                {verseAnnotations.map((a, i) => (
                  <View key={i} style={[styles(C).annotCard, { borderLeftColor: a.color || C.accent }]}>
                    {annotationMode === 'group' && (
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:4 }}>
                        <Text style={{ fontSize:14 }}>{getAvatar(a.userAvatarId).emoji}</Text>
                        <Text style={[styles(C).mutedText]}>{a.role === 'admin' || a.role === 'leader' ? '✝️ ' : ''}{a.userName}</Text>
                      </View>
                    )}
                    <Text style={[styles(C).bodyText, { fontStyle:'italic', color:C.muted }]}>{a.text}</Text>
                  </View>
                ))}
              </View>
            );
          })}
          {verses.length === 0 && !loading && <EmptyState icon="📖" title="No verses loaded" subtitle="Select a book and chapter then tap Go" />}
          <Text style={[styles(C).mutedText, { textAlign:'center', marginTop:24, fontStyle:'italic' }]}>Tap to annotate · Long press to highlight</Text>
        </ScrollView>
      )}

      <AnnotationModal visible={showAnnotationModal} verse={selectedVerse} book={book} chapter={chapter} user={user} onClose={() => { setShowAnnotationModal(false); setSelectedVerse(null); }} />
      <HighlightPicker visible={showHighlightPicker} verse={selectedVerse} book={book} chapter={chapter} user={user} currentColor={selectedVerse ? highlights[selectedVerse.verse] : null} onSelect={saveHighlight} onClear={clearHighlight} onClose={() => { setShowHighlightPicker(false); setSelectedVerse(null); }} />
    </SafeAreaView>
  );
}

// ─── PLAN ────────────────────────────────────────────────
function PlanScreen({ user, activePlan, onNav, onPlanUpdated }) {
  const { C } = useSettings();
  const [week, setWeek] = useState(1);
  const canEdit = user?.role === 'admin' || user?.canEditPlan;
  const daysThisWeek = activePlan?.days?.filter(d => Math.ceil(d.day / 7) === week) || [];

  async function markDone(dayId, current) {
    if (!activePlan?.id) return;
    try {
      const updatedDays = activePlan.days.map(d => d.id === dayId ? { ...d, done: !current } : d);
      await updateDoc(doc(db, 'readingPlans', activePlan.id), { days: updatedDays });
      onPlanUpdated({ ...activePlan, days: updatedDays });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { Alert.alert('Error', 'Could not update.'); }
  }

  return (
    <SafeAreaView style={styles(C).safe} edges={['top']}>
      <View style={styles(C).screenHeader}>
        <View style={styles(C).row}>
          <View>
            <Text style={styles(C).pageTitle}>Reading Plan</Text>
            <View style={styles(C).decorRule} />
          </View>
          {canEdit && (
            <TouchableOpacity onPress={() => onNav('planBuilder')} style={styles(C).editBtn} accessibilityRole="button" accessibilityLabel={activePlan ? 'Edit plan' : 'Create plan'}>
              <Text style={styles(C).editBtnText}>{activePlan ? 'Edit Plan' : '+ Create'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {!activePlan ? (
        <View style={{ flex:1, justifyContent:'center' }}>
          <EmptyState icon="📅" title="No reading plan yet" subtitle={canEdit ? "Tap + Create to build your first plan" : "Your leader has not set up a plan yet"} />
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles(C).weekTabsWrap} contentContainerStyle={{ paddingHorizontal:20 }}>
            {Array.from({ length: activePlan.weeks }, (_, i) => i + 1).map(w => (
              <TouchableOpacity key={w} onPress={() => setWeek(w)} style={[styles(C).weekTab, week===w && styles(C).weekTabOn]} accessibilityRole="button" accessibilityLabel={`Week ${w}`}>
                <Text style={[styles(C).weekTabText, week===w && { color:C.bg }]}>Week {w}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={daysThisWeek} keyExtractor={d => d.id}
            contentContainerStyle={{ padding:16, gap:10 }}
            ListEmptyComponent={<EmptyState icon="📅" title="No days this week" subtitle="No passages assigned yet" />}
            renderItem={({ item: d }) => (
              <TouchableOpacity onPress={() => onNav('discussion', { day: d })} style={[styles(C).dayCard, d.today && { borderColor:C.accent, backgroundColor:`${C.accent}08` }]} accessibilityRole="button" accessibilityLabel={`Day ${d.day}, ${d.passage || 'No passage'}`}>
                <TouchableOpacity onPress={() => markDone(d.id, d.done)} style={[styles(C).dayCheck, { backgroundColor: d.done ? C.ok : d.today ? C.accent : C.cardAlt }]} accessibilityRole="button" accessibilityLabel={d.done ? 'Mark as incomplete' : 'Mark as complete'}>
                  <Text style={{ color: d.done || d.today ? C.bg : C.muted, fontFamily:'Nunito_800ExtraBold', fontSize:12 }}>{d.done ? '✓' : d.day}</Text>
                </TouchableOpacity>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <Text style={styles(C).dayTitle}>{d.passage || `Day ${d.day}`}</Text>
                    {d.today && <View style={styles(C).todayBadge}><Text style={styles(C).todayBadgeText}>TODAY</Text></View>}
                  </View>
                  {d.prompts?.length > 0 && <Text style={[styles(C).mutedText, { marginTop:3, fontSize:11 }]}>💬 {d.prompts.length} {d.prompts.length === 1 ? 'prompt' : 'prompts'}</Text>}
                  {d.description ? <Text style={[styles(C).mutedText, { marginTop:2, fontSize:11 }]} numberOfLines={1}>{d.description}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.dim} />
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

// ─── PLAN BUILDER ────────────────────────────────────────
function PlanBuilderScreen({ user, activePlan, onDone, onBack }) {
  const { C } = useSettings();
  const [title, setTitle] = useState(activePlan?.title || '');
  const [weeks, setWeeks] = useState(activePlan?.weeks?.toString() || '6');
  const [startDate, setStartDate] = useState(activePlan?.startDate || new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState(activePlan?.days || []);
  const [editingDay, setEditingDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('setup');
  const [bulkBook, setBulkBook] = useState('John');
  const [bulkStartCh, setBulkStartCh] = useState('1');

  function handleBack() {
    if (step === 'builder') {
      Alert.alert('Exit plan builder?', 'Unsaved changes will be lost.', [
        { text: 'Stay' },
        { text: 'Exit', style: 'destructive', onPress: onBack },
      ]);
    } else {
      onBack();
    }
  }

  function buildDays(numWeeks) {
    const total = parseInt(numWeeks) * 7;
    setDays(Array.from({ length: total }, (_, i) => {
      const ex = days.find(d => d.day === i + 1);
      return ex || { id:`day-${i+1}`, day:i+1, passage:'', description:'', prompts:[], done:false };
    }));
  }

  function applyBulkAssign() {
    const startCh = parseInt(bulkStartCh) || 1;
    const newDays = days.map((d, i) => {
      if (d.passage) return d;
      return { ...d, passage: `${bulkBook} ${startCh + i}` };
    });
    setDays(newDays);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Bulk assigned', `Filled empty days starting at ${bulkBook} ${startCh}`);
  }

  async function handleSave(status = 'published') {
    if (!title) { Alert.alert('Missing title', 'Please enter a plan title.'); return; }
    setLoading(true);
    try {
      const planData = { groupId:user.groupId, title, weeks:parseInt(weeks), startDate, status, days, updatedAt:serverTimestamp() };
      if (activePlan?.id) {
        await updateDoc(doc(db, 'readingPlans', activePlan.id), planData);
        onDone({ ...planData, id:activePlan.id });
      } else {
        const ref = await addDoc(collection(db, 'readingPlans'), { ...planData, createdAt:serverTimestamp() });
        onDone({ ...planData, id:ref.id });
      }
    } catch { Alert.alert('Error', 'Could not save plan.'); }
    setLoading(false);
  }

  if (editingDay !== null) {
    return <DayEditor day={days[editingDay]} onSave={updated => { const nd = [...days]; nd[editingDay] = updated; setDays(nd); setEditingDay(null); }} onBack={() => setEditingDay(null)} />;
  }

  if (step === 'setup') {
    return (
      <ScreenWrapper scroll>
        <View style={styles(C).pad}>
          <PageHeader title={'Plan Setup'} subtitle="Configure your reading plan" onBack={handleBack} />
          {[
            { label:'Plan Title', value:title, set:setTitle, placeholder:'e.g. Summer in the Gospels' },
            { label:'Duration (weeks)', value:weeks, set:setWeeks, placeholder:'6', kb:'number-pad' },
            { label:'Start Date (YYYY-MM-DD)', value:startDate, set:setStartDate, placeholder:'2026-05-01' },
          ].map(f => (
            <View key={f.label} style={{ marginBottom:16 }}>
              <Text style={styles(C).inputLabel}>{f.label}</Text>
              <TextInput value={f.value} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={C.dim} keyboardType={f.kb} style={styles(C).input} accessibilityLabel={f.label} />
            </View>
          ))}
          <GoldButton label="Build the Plan →" onPress={() => { buildDays(weeks); setStep('builder'); }} style={{ marginTop:8 }} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <SafeAreaView style={styles(C).safe} edges={['top']}>
      <View style={styles(C).screenHeader}>
        <View style={styles(C).row}>
          <View style={{ flex:1 }}>
            <TouchableOpacity onPress={handleBack} style={{ marginBottom:6 }} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={{ color:C.accent, fontFamily:'Nunito_700Bold', fontSize:14 }}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={styles(C).pageTitle}>{title}</Text>
            <Text style={[styles(C).mutedText, { marginTop:4 }]}>{weeks} weeks · {days.length} days · tap to edit</Text>
          </View>
          <View style={{ gap:8 }}>
            <TouchableOpacity onPress={() => handleSave('draft')} style={[styles(C).editBtn, { borderColor:C.muted }]} accessibilityRole="button" accessibilityLabel="Save as draft">
              <Text style={[styles(C).editBtnText, { color:C.muted }]}>Draft</Text>
            </TouchableOpacity>
            <GoldButton label="Publish" onPress={() => handleSave('published')} loading={loading} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.ultraDim, backgroundColor:C.card }}>
        <Text style={styles(C).inputLabel}>BULK ASSIGN</Text>
        <View style={{ flexDirection:'row', gap:8, marginTop:8, alignItems:'center' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex:1 }}>
            {BOOKS.map(b => (
              <TouchableOpacity key={b} onPress={() => setBulkBook(b)} style={[styles(C).pill, bulkBook===b && styles(C).pillOn, { marginRight:6 }]} accessibilityRole="button" accessibilityLabel={b}>
                <Text style={[styles(C).pillText, bulkBook===b && { color:C.bg }]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput value={bulkStartCh} onChangeText={setBulkStartCh} placeholder="Ch" placeholderTextColor={C.dim} keyboardType="number-pad" style={[styles(C).chInput, { width:50 }]} accessibilityLabel="Start chapter" />
          <TouchableOpacity onPress={applyBulkAssign} style={[styles(C).pickerPill, { borderColor:C.accent, backgroundColor:`${C.accent}15` }]} accessibilityRole="button" accessibilityLabel="Apply bulk assign">
            <Text style={{ color:C.accent, fontFamily:'Nunito_700Bold', fontSize:13 }}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={days} keyExtractor={d => d.id}
        contentContainerStyle={{ padding:16, gap:8 }}
        renderItem={({ item: d, index }) => {
          const weekNum = Math.ceil(d.day / 7);
          const showWeekHeader = index === 0 || Math.ceil(days[index - 1].day / 7) !== weekNum;
          return (
            <View>
              {showWeekHeader && (
                <View style={{ marginBottom:6, marginTop:10 }}>
                  <Text style={[styles(C).sectionText, { color:C.dim }]}>WEEK {weekNum}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setEditingDay(index)} style={[styles(C).dayCard, d.passage && { borderColor:`${C.accent}44` }]} accessibilityRole="button" accessibilityLabel={`Edit day ${d.day}`}>
                <View style={[styles(C).dayCheck, { backgroundColor: d.passage ? `${C.accent}22` : C.cardAlt }]}>
                  <Text style={{ color: d.passage ? C.accent : C.dim, fontFamily:'Nunito_800ExtraBold', fontSize:11 }}>{d.day}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles(C).dayTitle}>{d.passage || 'Tap to add passage'}</Text>
                  {d.prompts?.length > 0 && <Text style={[styles(C).mutedText, { fontSize:11, marginTop:2 }]}>💬 {d.prompts.length} prompt{d.prompts.length > 1 ? 's' : ''}</Text>}
                </View>
                <Ionicons name="create-outline" size={16} color={C.dim} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── DAY EDITOR ──────────────────────────────────────────
function DayEditor({ day, onSave, onBack }) {
  const { C } = useSettings();
  const [passage, setPassage] = useState(day.passage || '');
  const [description, setDescription] = useState(day.description || '');
  const [prompts, setPrompts] = useState(day.prompts || []);
  const [newPrompt, setNewPrompt] = useState('');

  function addPrompt() {
    if (!newPrompt.trim()) return;
    setPrompts(p => [...p, newPrompt.trim()]);
    setNewPrompt('');
  }

  return (
    <ScreenWrapper scroll>
      <View style={styles(C).pad}>
        <PageHeader title={`Day ${day.day}`} subtitle="Passage and discussion prompts" onBack={onBack} />
        <Text style={styles(C).inputLabel}>Passage</Text>
        <TextInput value={passage} onChangeText={setPassage} placeholder="e.g. John 3:1-21" placeholderTextColor={C.dim} style={[styles(C).input, { marginBottom:16 }]} accessibilityLabel="Passage" />
        <Text style={styles(C).inputLabel}>Description (optional)</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Brief description" placeholderTextColor={C.dim} style={[styles(C).input, { marginBottom:24 }]} multiline accessibilityLabel="Description" />
        <Text style={styles(C).inputLabel}>Discussion Prompts</Text>
        <Text style={[styles(C).mutedText, { marginBottom:14 }]}>Add multiple prompts for the group</Text>
        {prompts.map((p, i) => (
          <View key={i} style={styles(C).promptRow}>
            <View style={styles(C).promptBadge}><Text style={styles(C).promptBadgeText}>{i + 1}</Text></View>
            <Text style={[styles(C).bodyText, { flex:1 }]}>{p}</Text>
            <TouchableOpacity onPress={() => setPrompts(pr => pr.filter((_, idx) => idx !== i))} accessibilityRole="button" accessibilityLabel="Remove prompt">
              <Text style={{ color:C.danger, fontSize:16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles(C).promptInputRow}>
          <TextInput value={newPrompt} onChangeText={setNewPrompt} placeholder="Type a prompt..." placeholderTextColor={C.dim} style={[styles(C).input, { flex:1 }]} multiline accessibilityLabel="New prompt" />
          <TouchableOpacity onPress={addPrompt} style={{ width:48, height:48 }} accessibilityRole="button" accessibilityLabel="Add prompt">
            <LinearGradient colors={[C.accent, C.soft]} style={{ width:48, height:48, borderRadius:13, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ color:C.bg, fontSize:22, fontFamily:'Nunito_900Black' }}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <GoldButton label="Save Day" onPress={() => onSave({ ...day, passage, description, prompts })} style={{ marginTop:24 }} />
      </View>
    </ScreenWrapper>
  );
}

// ─── DISCUSSION ──────────────────────────────────────────
function DiscussionScreen({ user, activePlan, selectedDay, onCommentRead }) {
  const { C } = useSettings();
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const day = selectedDay || activePlan?.days?.find(d => d.today);
  const dayId = day && user?.groupId ? `${user.groupId}_day${day.day}` : null;

  useEffect(() => {
    if (!dayId) return;
    const q = query(collection(db, 'discussions', dayId, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const newComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(newComments);
      onCommentRead && onCommentRead(newComments.length);
    });
    return unsub;
  }, [dayId]);

  async function sendComment() {
    if (!comment.trim() || !dayId) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'discussions', dayId, 'comments'), {
        text: comment.trim(), userId: user.uid, userName: user.name,
        role: user.role, userAvatarId: user.avatarId, likes: [], createdAt: serverTimestamp(),
      });
      setComment('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('Error', 'Could not send.'); }
    setSending(false);
  }

  async function toggleLike(commentId, currentLikes) {
    if (!dayId) return;
    const ref = doc(db, 'discussions', dayId, 'comments', commentId);
    const hasLiked = currentLikes?.includes(user.uid);
    await updateDoc(ref, { likes: hasLiked ? currentLikes.filter(id => id !== user.uid) : arrayUnion(user.uid) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function deleteComment(commentId) {
    const canDelete = user?.role === 'admin' || user?.role === 'leader';
    if (!canDelete || !dayId) return;
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDoc(doc(db, 'discussions', dayId, 'comments', commentId)); } }
    ]);
  }

  function fillPrompt(p) {
    setComment(p);
  }

  return (
    <SafeAreaView style={styles(C).safe} edges={['top']}>
      <View style={styles(C).screenHeader}>
        <Text style={styles(C).pageTitle}>{day?.passage || 'Discussion'}</Text>
        <View style={styles(C).decorRule} />
        <Text style={[styles(C).mutedText, { marginTop:6 }]}>{day ? `Day ${day.day} · ${activePlan?.title || ''}` : 'Share what is on your heart'}</Text>
      </View>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments} keyExtractor={c => c.id}
          contentContainerStyle={{ padding:16, gap:10 }}
          ListHeaderComponent={
            day?.prompts?.length > 0 ? (
              <View style={styles(C).promptsCard}>
                <SectionLabel>Discussion Prompts</SectionLabel>
                {day.prompts.map((p, i) => (
                  <TouchableOpacity key={i} onPress={() => fillPrompt(p)} style={[styles(C).promptRow, { marginTop:10 }]} accessibilityRole="button" accessibilityLabel={`Use prompt: ${p}`}>
                    <View style={styles(C).promptBadge}><Text style={styles(C).promptBadgeText}>{i + 1}</Text></View>
                    <Text style={[styles(C).bodyText, { flex:1, fontStyle:'italic', color:C.muted }]}>{p}</Text>
                    <Ionicons name="arrow-undo" size={14} color={C.dim} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems:'center', padding:28 }}>
              <Text style={{ fontSize:36, marginBottom:10, opacity:0.5 }}>💬</Text>
              <Text style={{ fontSize:15, fontFamily:'Nunito_800ExtraBold', color:C.text, marginBottom:6, textAlign:'center' }}>No comments yet</Text>
              <Text style={{ fontSize:12, fontFamily:'Nunito_400Regular', color:C.muted, textAlign:'center', lineHeight:18 }}>Be the first to share what stood out to you today.</Text>
            </View>
          }
          renderItem={({ item: c }) => {
            const commenterAvatar = getAvatar(c.userAvatarId);
            return (
              <TouchableOpacity onLongPress={() => deleteComment(c.id)} style={[styles(C).commentCard, (c.role==='admin'||c.role==='leader') && styles(C).commentCardLeader]} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`Comment by ${c.userName}`}>
                <View style={{ flexDirection:'row', gap:10 }}>
                  <View style={styles(C).commentAvatar}>
                    <Text style={{ fontSize:18 }}>{commenterAvatar.emoji}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <View style={[styles(C).row, { alignItems:'center' }]}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                        <Text style={styles(C).commentName}>{c.userName}</Text>
                        {(c.role==='admin'||c.role==='leader') && <View style={styles(C).leaderBadge}><Text style={styles(C).leaderBadgeText}>LEADER</Text></View>}
                      </View>
                      <Text style={styles(C).mutedText}>{timeAgo(c.createdAt)}</Text>
                    </View>
                    <Text style={[styles(C).bodyText, { marginTop:6 }]}>{c.text}</Text>
                    <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
                      <TouchableOpacity onPress={() => toggleLike(c.id, c.likes)} style={{ flexDirection:'row', alignItems:'center', gap:4 }} accessibilityRole="button" accessibilityLabel={c.likes?.includes(user?.uid) ? 'Unlike' : 'Like'}>
                        <Text style={{ fontSize:13 }}>{c.likes?.includes(user?.uid) ? '❤️' : '🤍'}</Text>
                        <Text style={[styles(C).mutedText, c.likes?.includes(user?.uid) && { color:C.accent }]}>{c.likes?.length || 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reply"><Text style={styles(C).mutedText}>Reply</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <View style={styles(C).commentBar}>
          <TextInput value={comment} onChangeText={setComment} placeholder="Share what is on your heart..." placeholderTextColor={C.dim} style={styles(C).commentInput} multiline accessibilityLabel="Comment input" />
          <TouchableOpacity onPress={sendComment} disabled={sending} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Send comment">
            <LinearGradient colors={[C.accent, C.soft]} style={styles(C).sendBtn}>
              {sending ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={styles(C).sendBtnText}>↑</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── SETTINGS SCREEN ─────────────────────────────────────
function SettingsScreen({ onBack }) {
  const { C, theme, setTheme, fontSize, setFontSize, serifMode, setSerifMode } = useSettings();

  return (
    <ScreenWrapper scroll>
      <View style={styles(C).pad}>
        <PageHeader title="Settings" subtitle="Customize your experience" onBack={onBack} />

        <View style={{ marginTop:20 }}>
          <SectionLabel>Appearance</SectionLabel>
          <View style={[styles(C).toggleRow, { marginTop:12 }]}>
            <View>
              <Text style={[styles(C).blockTitle, { fontSize:14 }]}>Dark Mode</Text>
              <Text style={styles(C).mutedText}>Toggle between dark and light theme</Text>
            </View>
            <Switch 
              value={theme === 'dark'} 
              onValueChange={(v) => setTheme(v ? 'dark' : 'light')} 
              trackColor={{ false:C.cardBorder, true:`${C.accent}88` }} 
              thumbColor={theme === 'dark' ? C.accent : C.dim} 
            />
          </View>
        </View>

        <View style={{ marginTop:24 }}>
          <SectionLabel>Typography</SectionLabel>
          <View style={[styles(C).toggleRow, { marginTop:12 }]}>
            <View>
              <Text style={[styles(C).blockTitle, { fontSize:14 }]}>Serif Font</Text>
              <Text style={styles(C).mutedText}>Use serif typeface for Bible text</Text>
            </View>
            <Switch 
              value={serifMode} 
              onValueChange={setSerifMode} 
              trackColor={{ false:C.cardBorder, true:`${C.accent}88` }} 
              thumbColor={serifMode ? C.accent : C.dim} 
            />
          </View>
        </View>

        <View style={{ marginTop:24 }}>
          <SectionLabel>Font Size</SectionLabel>
          <View style={{ marginTop:12, backgroundColor:C.cardAlt, borderRadius:12, padding:16, borderWidth:1, borderColor:C.cardBorder }}>
            <View style={[styles(C).row, { marginBottom:12 }]}>
              <Text style={styles(C).mutedText}>Small</Text>
              <Text style={[styles(C).blockTitle, { fontSize:14 }]}>{fontSize}px</Text>
              <Text style={styles(C).mutedText}>Large</Text>
            </View>
            <Slider
              value={fontSize}
              onValueChange={setFontSize}
              minimumValue={13}
              maximumValue={20}
              step={1}
              minimumTrackTintColor={C.accent}
              maximumTrackTintColor={C.cardBorder}
              thumbTintColor={C.accent}
            />
            <Text style={[styles(C).mutedText, { marginTop:8, textAlign:'center' }]}>
              "The Lord is my shepherd; I shall not want."
            </Text>
          </View>
        </View>

        <View style={{ marginTop:32, alignItems:'center' }}>
          <Text style={[styles(C).mutedText, { fontSize:11 }]}>LifeKindled v1.0</Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}

// ─── LEADER DASHBOARD ────────────────────────────────────
function LeaderDashboardScreen({ user, activePlan, onBack }) {
  const { C } = useSettings();
  const [members, setMembers] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.groupId) return;
    const load = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', user.groupId));
        if (groupDoc.exists()) setGroupData(groupDoc.data());

        const q = query(collection(db, 'users'), where('groupId', '==', user.groupId));
        const unsub = onSnapshot(q, snap => {
          setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        return unsub;
      } catch { setLoading(false); }
    };
    load();
  }, [user?.groupId]);

  function getMemberProgress(memberId) {
    if (!activePlan?.days) return { completed: 0, total: 0, percent: 0 };
    // In a real app, you'd track per-user progress. For now, we'll show plan-wide stats
    const completed = activePlan.days.filter(d => d.done).length;
    const total = activePlan.days.length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }

  function copyInviteCode() {
    if (groupData?.inviteCode) {
      // Clipboard.setString(groupData.inviteCode);
      Alert.alert('Copied!', `Invite code ${groupData.inviteCode} copied to clipboard.`);
    }
  }

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles(C).safe, { alignItems:'center', justifyContent:'center' }]}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll>
      <View style={styles(C).pad}>
        <PageHeader title="Leader
Dashboard" subtitle="Group insights and management" onBack={onBack} />

        {/* Invite Code Card */}
        <View style={[styles(C).readingCard, { marginTop:20, backgroundColor:`${C.accent}08`, borderColor:`${C.accent}44` }]}>
          <SectionLabel>Invite Code</SectionLabel>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginTop:12 }}>
            <View style={{ flex:1, backgroundColor:C.card, borderRadius:12, padding:14, borderWidth:1, borderColor:C.cardBorder }}>
              <Text style={{ fontFamily:'Nunito_900Black', fontSize:20, color:C.accent, letterSpacing:4, textAlign:'center' }}>
                {groupData?.inviteCode || 'LOADING...'}
              </Text>
            </View>
            <TouchableOpacity onPress={copyInviteCode} style={[styles(C).pickerPill, { borderColor:C.accent, backgroundColor:`${C.accent}15`, paddingHorizontal:16 }]} accessibilityRole="button" accessibilityLabel="Copy invite code">
              <Ionicons name="copy-outline" size={18} color={C.accent} />
            </TouchableOpacity>
          </View>
          <Text style={[styles(C).mutedText, { marginTop:8, textAlign:'center' }]}>Share this code with new members</Text>
        </View>

        {/* Stats Overview */}
        <View style={[styles(C).leftBlock, { marginTop:24 }]}>
          <SectionLabel>Overview</SectionLabel>
          <View style={{ flexDirection:'row', gap:10, marginTop:12 }}>
            <View style={{ flex:1, backgroundColor:C.card, borderRadius:14, padding:16, borderWidth:1, borderColor:C.cardBorder, alignItems:'center' }}>
              <Text style={{ fontSize:28, fontFamily:'PlayfairDisplay_700Bold', color:C.accent }}>{members.length}</Text>
              <Text style={[styles(C).mutedText, { marginTop:4 }]}>Members</Text>
            </View>
            <View style={{ flex:1, backgroundColor:C.card, borderRadius:14, padding:16, borderWidth:1, borderColor:C.cardBorder, alignItems:'center' }}>
              <Text style={{ fontSize:28, fontFamily:'PlayfairDisplay_700Bold', color:C.ok }}>
                {activePlan?.days?.filter(d => d.done).length || 0}
              </Text>
              <Text style={[styles(C).mutedText, { marginTop:4 }]}>Days Done</Text>
            </View>
            <View style={{ flex:1, backgroundColor:C.card, borderRadius:14, padding:16, borderWidth:1, borderColor:C.cardBorder, alignItems:'center' }}>
              <Text style={{ fontSize:28, fontFamily:'PlayfairDisplay_700Bold', color:C.purple }}>
                {activePlan?.weeks || 0}
              </Text>
              <Text style={[styles(C).mutedText, { marginTop:4 }]}>Weeks</Text>
            </View>
          </View>
        </View>

        {/* Member List */}
        <View style={{ marginTop:28 }}>
          <SectionLabel>Members</SectionLabel>
          <View style={{ marginTop:12, gap:10 }}>
            {members.map((m, i) => {
              const avatar = getAvatar(m.avatarId);
              const progress = getMemberProgress(m.uid);
              return (
                <View key={i} style={[styles(C).row, { backgroundColor:C.card, borderRadius:14, padding:14, borderWidth:1, borderColor:C.cardBorder }]}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
                    <View style={{ width:40, height:40, borderRadius:12, backgroundColor:C.cardAlt, alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:20 }}>{avatar.emoji}</Text>
                    </View>
                    <View>
                      <Text style={styles(C).commentName}>{m.name}</Text>
                      <Text style={styles(C).mutedText}>{m.email}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems:'flex-end', gap:4 }}>
                    <View style={styles(C).roleBadge}>
                      <Text style={styles(C).roleBadgeText}>{(m.role || 'member').toUpperCase()}</Text>
                    </View>
                    <Text style={[styles(C).mutedText, { fontSize:10 }]}>{progress.percent}% complete</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

// ─── PROFILE ─────────────────────────────────────────────
function ProfileScreen({ user, activePlan, onSignOut, onNav }) {
  const { C, fontSize } = useSettings();
  const [myAnnotations, setMyAnnotations] = useState([]);
  const [myHighlights, setMyHighlights] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const completed = activePlan?.days?.filter(d => d.done)?.length || 0;
  const total = activePlan?.days?.length || 0;
  const isAdmin = user?.role === 'admin';
  const avatar = getAvatar(user?.avatarId);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'annotations'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => { setMyAnnotations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'highlights'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => { setMyHighlights(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.groupId || !isAdmin) return;
    const q = query(collection(db, 'users'), where('groupId', '==', user.groupId));
    const unsub = onSnapshot(q, snap => { setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [user?.groupId, isAdmin]);

  async function updateAvatar(avatarId) {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { avatarId });
      setShowAvatarPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('Error', 'Could not update avatar.'); }
  }

  async function removeMember(memberId) {
    if (!isAdmin) return;
    Alert.alert('Remove member?', 'This will remove them from the group.', [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await updateDoc(doc(db, 'users', memberId), { groupId: null, role: 'member' }); }
        catch { Alert.alert('Error', 'Could not remove member.'); }
      }}
    ]);
  }

  return (
    <ScreenWrapper scroll>
      <View style={styles(C).pad}>
        <View style={[styles(C).row, { marginTop:12 }]}>
          <View style={{ flex:1 }}>
            <Text style={styles(C).greeting}>Your Profile</Text>
            <Text style={[styles(C).homeName, { fontSize: 34 + (fontSize - 15) * 0.5 }]}>{user?.name || 'Your Name'}.</Text>
          </View>
          <TouchableOpacity onPress={() => onNav('settings')} style={{ padding:8 }} accessibilityRole="button" accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={24} color={C.accent} />
          </TouchableOpacity>
        </View>
        <View style={styles(C).decorRule} />

        <TouchableOpacity onPress={() => setShowAvatarPicker(true)} style={{ alignSelf:'center', marginTop:20 }} accessibilityRole="button" accessibilityLabel="Change avatar">
          <LinearGradient colors={[C.accent, C.soft]} style={[styles(C).profileAvatar, { width:80, height:80, borderRadius:24 }]}>
            <Text style={{ fontSize:36 }}>{avatar.emoji}</Text>
          </LinearGradient>
          <View style={{ position:'absolute', bottom:-4, right:-4, backgroundColor:C.card, borderRadius:10, padding:4, borderWidth:1, borderColor:C.cardBorder }}>
            <Ionicons name="camera" size={14} color={C.accent} />
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:16, justifyContent:'center' }}>
          <Text style={styles(C).mutedText}>{user?.email || ''}</Text>
          <View style={styles(C).roleBadge}>
            <Text style={styles(C).roleBadgeText}>{(user?.role || 'member').toUpperCase()}</Text>
          </View>
        </View>

        {isAdmin && (
          <GoldButton 
            label="Leader Dashboard" 
            onPress={() => onNav('leaderDashboard')} 
            style={{ marginTop:20 }} 
          />
        )}

        <View style={styles(C).divider} />

        {/* Reading history */}
        <SectionLabel>Reading History</SectionLabel>
        <View style={[styles(C).leftBlock, { marginTop:12 }]}>
          {total > 0 ? (
            <>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                {Array.from({ length: Math.min(total, 21) }, (_, i) => (
                  <View key={i} style={[styles(C).histDot, { backgroundColor: i < completed ? (i < 3 ? C.ok : C.accent) : C.cardAlt }]}>
                    <Text style={{ fontSize:9, color: i < completed ? C.bg : C.dim, fontFamily:'Nunito_700Bold' }}>{i + 1}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles(C).mutedText}>{completed} of {total} days complete</Text>
            </>
          ) : (
            <EmptyState icon="📖" title="No reading history yet" subtitle="Complete days in the reading plan to track progress" />
          )}
        </View>

        {/* Highlights */}
        <View style={{ marginTop:28 }}><SectionLabel>My Highlights</SectionLabel></View>
        <View style={[styles(C).leftBlock, { marginTop:12 }]}>
          {myHighlights.length > 0 ? (
            myHighlights.slice(0, 5).map((h, i) => (
              <View key={i} style={[styles(C).annotProfileCard, { marginBottom:8 }]}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
                  <View style={[styles(C).sectionBar, { backgroundColor: h.color }]} />
                  <Text style={[styles(C).sectionText, { color: h.color }]}>{h.book} {h.chapter}:{h.verseNum}</Text>
                </View>
                <Text style={[styles(C).mutedText, { fontStyle:'italic', fontSize:11 }]} numberOfLines={2}>{h.verseText}</Text>
              </View>
            ))
          ) : (
            <EmptyState icon="✦" title="No highlights yet" subtitle="Long press any verse in the Bible reader to highlight it" />
          )}
        </View>

        {/* Annotations */}
        <View style={{ marginTop:28 }}><SectionLabel>My Annotations</SectionLabel></View>
        <View style={[styles(C).leftBlock, { marginTop:12 }]}>
          {myAnnotations.length > 0 ? (
            myAnnotations.map((a, i) => (
              <View key={i} style={styles(C).annotProfileCard}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
                  <View style={[styles(C).sectionBar, { backgroundColor: a.color || C.accent }]} />
                  <Text style={[styles(C).sectionText, { color: a.color || C.accent }]}>{a.book} {a.chapter}:{a.verseNum} · {a.isPublic ? 'shared' : 'private'}</Text>
                </View>
                <Text style={[styles(C).mutedText, { fontStyle:'italic', fontSize:11 }]} numberOfLines={1}>{a.verseText}</Text>
                <Text style={[styles(C).bodyText, { marginTop:4, fontSize:12 }]}>{a.text}</Text>
              </View>
            ))
          ) : (
            <EmptyState icon="✍️" title="No annotations yet" subtitle="Tap any verse in the Bible reader to add a note" />
          )}
        </View>

        {/* Admin — member list */}
        {isAdmin && (
          <>
            <View style={{ marginTop:28 }}>
              <TouchableOpacity onPress={() => setShowMembers(!showMembers)} style={[styles(C).row]} accessibilityRole="button" accessibilityLabel="Toggle member list">
                <SectionLabel>Group Members ({members.length})</SectionLabel>
                <Ionicons name={showMembers ? 'chevron-up' : 'chevron-down'} size={16} color={C.accent} />
              </TouchableOpacity>
            </View>
            {showMembers && (
              <View style={[styles(C).leftBlock, { marginTop:12, gap:10 }]}>
                {members.map((m, i) => {
                  const mAvatar = getAvatar(m.avatarId);
                  return (
                    <View key={i} style={[styles(C).row, { backgroundColor:C.card, borderRadius:12, padding:12, borderWidth:1, borderColor:C.cardBorder }]}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                        <Text style={{ fontSize:20 }}>{mAvatar.emoji}</Text>
                        <View>
                          <Text style={styles(C).commentName}>{m.name}</Text>
                          <Text style={styles(C).mutedText}>{m.email}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                        <View style={styles(C).roleBadge}>
                          <Text style={styles(C).roleBadgeText}>{(m.role || 'member').toUpperCase()}</Text>
                        </View>
                        {m.uid !== user.uid && (
                          <TouchableOpacity onPress={() => removeMember(m.uid)} accessibilityRole="button" accessibilityLabel={`Remove ${m.name}`}>
                            <Ionicons name="close-circle" size={20} color={C.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <TouchableOpacity onPress={onSignOut} style={[styles(C).outlineBtn, { borderColor:C.danger, marginTop:32 }]} accessibilityRole="button" accessibilityLabel="Sign out">
          <Text style={[styles(C).outlineBtnText, { color:C.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <AvatarPicker 
        visible={showAvatarPicker} 
        currentAvatar={user?.avatarId} 
        onSelect={updateAvatar} 
        onClose={() => setShowAvatarPicker(false)} 
      />
    </ScreenWrapper>
  );
}


// ─── APP INNER ───────────────────────────────────────────
const MAIN = ['home','bible','plan','discussion','profile'];

function AppInner({ screen, setScreen, firebaseUser, user, setUser,
  activePlan, setActivePlan, selectedDay, setSelectedDay,
  initializing, unreadCount, setUnreadCount, isOffline,
  fadeAnim, fontsLoaded, loadPlan, handleSignOut }) {
  const { C } = useSettings();

  if (!fontsLoaded || initializing) {
    return (
      <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}>
        <BurningBushLogo size={60} />
        <ActivityIndicator color={C.accent} size="large" style={{ marginTop:20 }} />
      </View>
    );
  }

  function navTo(screenId, params) {
    Animated.timing(fadeAnim, { toValue:0, duration:80, useNativeDriver:true }).start(() => {
      if (screenId === 'discussion') {
        if (params?.day) setSelectedDay(params.day);
        setUnreadCount(0);
      } else if (screenId !== 'discussion') { setSelectedDay(null); }
      setScreen(screenId);
      Animated.timing(fadeAnim, { toValue:1, duration:180, useNativeDriver:true }).start();
    });
  }

  const renderScreen = () => {
    switch (screen) {
      case 'signin':          return <SignInScreen />;
      case 'whoAreYou':       return <WhoAreYouScreen onLeader={() => setScreen('leaderCreate')} onMember={() => setScreen('memberCode')} />;
      case 'leaderCreate':    return <LeaderCreateScreen firebaseUser={firebaseUser} onDone={u => { setUser(u); setScreen('home'); }} onBack={() => setScreen('whoAreYou')} />;
      case 'memberCode':      return <MemberCodeScreen firebaseUser={firebaseUser} onDone={u => { setUser(u); loadPlan(u.groupId); setScreen('home'); }} onBack={() => setScreen('whoAreYou')} />;
      case 'home':            return <HomeScreen onNav={navTo} user={user} activePlan={activePlan} onPlanUpdated={setActivePlan} />;
      case 'bible':           return <BibleScreen user={user} />;
      case 'plan':            return <PlanScreen user={user} activePlan={activePlan} onNav={navTo} onPlanUpdated={setActivePlan} />;
      case 'planBuilder':     return <PlanBuilderScreen user={user} activePlan={activePlan} onDone={plan => { setActivePlan(plan); setScreen('plan'); }} onBack={() => setScreen('plan')} />;
      case 'discussion':      return <DiscussionScreen user={user} activePlan={activePlan} selectedDay={selectedDay} onCommentRead={count => setUnreadCount(Math.max(0, count-1))} />;
      case 'profile':         return <ProfileScreen user={user} activePlan={activePlan} onSignOut={handleSignOut} onNav={navTo} />;
      case 'settings':        return <SettingsScreen onBack={() => setScreen('profile')} />;
      case 'leaderDashboard': return <LeaderDashboardScreen user={user} activePlan={activePlan} onBack={() => setScreen('profile')} />;
      default:                return <SignInScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ flex:1, backgroundColor:C.bg }}>
        {isOffline && (
          <View style={{ backgroundColor:C.cardAlt, paddingVertical:6, alignItems:'center', borderBottomWidth:1, borderBottomColor:C.cardBorder }}>
            <Text style={{ fontSize:11, color:C.muted, fontFamily:'Nunito_700Bold' }}>📡 Offline mode</Text>
          </View>
        )}
        <Animated.View style={{ flex:1, opacity:fadeAnim }}>
          {renderScreen()}
        </Animated.View>
        {MAIN.includes(screen) && <BottomNav active={screen} onNav={navTo} unreadCount={unreadCount} />}
      </View>
    </SafeAreaProvider>
  );
}

// ─── ROOT APP ────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('signin');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
    PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(userData);
            await loadPlan(userData.groupId);
            setScreen('home');
          } else { setScreen('whoAreYou'); }
        } catch { setScreen('whoAreYou'); }
      } else {
        setFirebaseUser(null); setUser(null); setScreen('signin');
      }
      setInitializing(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const on = () => setIsOffline(false);
      const off = () => setIsOffline(true);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
      return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }
  }, []);

  async function loadPlan(groupId) {
    if (!groupId) return;
    try {
      const q = query(collection(db,'readingPlans'), where('groupId','==',groupId), where('status','==','published'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const planData = { id:snap.docs[0].id, ...snap.docs[0].data() };
        const today = new Date();
        planData.days = planData.days.map(d => {
          const dayDate = new Date(planData.startDate);
          dayDate.setDate(dayDate.getDate()+d.day-1);
          return { ...d, today:dayDate.toDateString()===today.toDateString() };
        });
        setActivePlan(planData);
      }
    } catch {}
  }

  async function handleSignOut() {
    try { await signOut(auth); } catch {}
    setUser(null); setFirebaseUser(null); setActivePlan(null); setSelectedDay(null); setScreen('signin');
  }

  return (
    <SettingsProvider>
      <AppInner
        screen={screen} setScreen={setScreen}
        firebaseUser={firebaseUser}
        user={user} setUser={setUser}
        activePlan={activePlan} setActivePlan={setActivePlan}
        selectedDay={selectedDay} setSelectedDay={setSelectedDay}
        initializing={initializing}
        unreadCount={unreadCount} setUnreadCount={setUnreadCount}
        isOffline={isOffline}
        fadeAnim={fadeAnim}
        fontsLoaded={fontsLoaded}
        loadPlan={loadPlan}
        handleSignOut={handleSignOut}
      />
    </SettingsProvider>
  );
}
// ─── STYLES ──────────────────────────────────────────────
const styles = (C) => StyleSheet.create({
  safe:             { flex:1, backgroundColor:C.bg },
  pad:              { paddingHorizontal:24, paddingTop:8 },
  centerPad:        { alignItems:'center', justifyContent:'center', padding:32 },
  row:              { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },

  pageTitle:        { fontSize:34, fontFamily:'PlayfairDisplay_700Bold', color:C.text, lineHeight:42 },
  blockTitle:       { fontSize:15, fontFamily:'Nunito_800ExtraBold', color:C.text },
  bodyText:         { fontSize:13, fontFamily:'Nunito_400Regular', color:C.text, lineHeight:20 },
  mutedText:        { fontSize:12, fontFamily:'Nunito_400Regular', color:C.muted },
  inputLabel:       { fontSize:10, fontFamily:'Nunito_800ExtraBold', color:C.dim, letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 },
  sectionRow:       { flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 },
  sectionBar:       { width:3, height:12, borderRadius:99, backgroundColor:C.accent },
  sectionText:      { fontSize:9, fontFamily:'Nunito_800ExtraBold', color:C.muted, letterSpacing:2, textTransform:'uppercase' },
  greeting:         { fontSize:12, fontFamily:'Nunito_400Regular', color:C.dim, letterSpacing:1 },
  homeName:         { fontSize:34, fontFamily:'PlayfairDisplay_700Bold', color:C.text, marginTop:2 },

  decorRule:        { height:1, width:'40%', backgroundColor:`${C.accent}40`, marginTop:14 },
  divider:          { height:1, backgroundColor:C.ultraDim, marginTop:24 },

  goldBtn:          { borderRadius:14, padding:15, alignItems:'center' },
  goldBtnText:      { fontFamily:'Nunito_800ExtraBold', fontSize:15, color:C.bg },
  outlineBtn:       { borderRadius:14, borderWidth:1.5, borderColor:C.accent, padding:13, alignItems:'center' },
  outlineBtnText:   { fontFamily:'Nunito_800ExtraBold', fontSize:14, color:C.accent },
  editBtn:          { borderRadius:10, borderWidth:1, borderColor:C.accent, paddingVertical:7, paddingHorizontal:14 },
  editBtnText:      { fontSize:12, fontFamily:'Nunito_700Bold', color:C.accent },
  doneBtn:          { flex:1, borderRadius:14, borderWidth:1.5, borderColor:C.accent, padding:14, alignItems:'center' },
  doneBtnActive:    { backgroundColor:C.ok, borderColor:C.ok },
  doneBtnText:      { fontFamily:'Nunito_800ExtraBold', fontSize:14, color:C.accent },

  authToggle:       { flexDirection:'row', backgroundColor:C.cardAlt, borderRadius:12, padding:4, borderWidth:1, borderColor:C.cardBorder },
  authToggleTab:    { flex:1, paddingVertical:10, borderRadius:10, alignItems:'center' },
  authToggleTabOn:  { backgroundColor:C.accent },
  authToggleText:   { fontSize:13, fontFamily:'Nunito_700Bold', color:C.muted },
  orRow:            { flexDirection:'row', alignItems:'center', gap:12 },
  orLine:           { flex:1, height:1, backgroundColor:C.cardBorder },
  orText:           { fontSize:12, fontFamily:'Nunito_400Regular', color:C.dim },
  emailBtn:         { borderRadius:14, borderWidth:1.5, borderColor:C.cardBorder, padding:15, alignItems:'center' },
  emailBtnText:     { fontFamily:'Nunito_800ExtraBold', fontSize:15, color:C.muted },

  readingCard:      { backgroundColor:C.card, borderRadius:20, padding:20, borderWidth:1, borderColor:C.cardBorder, overflow:'hidden', position:'relative' },
  ghostNum:         { position:'absolute', right:-8, top:-16, fontSize:100, fontFamily:'PlayfairDisplay_700Bold', color:`${C.accent}08`, lineHeight:120 },
  leftBlock:        { borderLeftWidth:2, borderLeftColor:`${C.accent}30`, paddingLeft:16 },
  infoBox:          { backgroundColor:`${C.accent}10`, borderRadius:12, padding:14, borderWidth:1, borderColor:`${C.accent}30` },
  infoText:         { fontSize:12, fontFamily:'Nunito_400Regular', color:C.accent },
  screenHeader:     { paddingHorizontal:24, paddingTop:16, paddingBottom:16, borderBottomWidth:1, borderBottomColor:C.ultraDim },
  promptsCard:      { backgroundColor:`${C.accent}08`, borderRadius:14, padding:14, borderWidth:1, borderColor:`${C.accent}30`, marginBottom:10 },
  promptRow:        { flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:8 },
  promptInputRow:   { flexDirection:'row', gap:10, alignItems:'flex-start', marginTop:12 },
  promptBadge:      { width:22, height:22, borderRadius:6, backgroundColor:`${C.accent}22`, alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 },
  promptBadgeText:  { fontSize:10, fontFamily:'Nunito_800ExtraBold', color:C.accent },
  commentCard:      { backgroundColor:C.card, borderRadius:14, padding:14, borderWidth:1, borderColor:C.cardBorder },
  commentCardLeader:{ backgroundColor:`${C.accent}08`, borderColor:`${C.accent}33` },
  commentAvatar:    { width:40, height:40, borderRadius:12, backgroundColor:C.cardAlt, alignItems:'center', justifyContent:'center' },
  commentName:      { fontFamily:'Nunito_800ExtraBold', fontSize:13, color:C.text },
  leaderBadge:      { backgroundColor:C.accent, borderRadius:4, paddingHorizontal:5, paddingVertical:1 },
  leaderBadgeText:  { fontSize:8, fontFamily:'Nunito_800ExtraBold', color:C.bg },
  discussPreview:   { backgroundColor:C.card, borderRadius:16, padding:16, borderWidth:1, borderColor:C.cardBorder, marginTop:12 },
  pastorNoteCard:   { backgroundColor:`${C.purple}12`, borderRadius:14, padding:14, borderWidth:1, borderColor:`${C.purple}33`, marginBottom:16 },

  input:            { backgroundColor:C.inputBg, borderRadius:12, borderWidth:1, borderColor:C.cardBorder, padding:14, color:C.text, fontFamily:'Nunito_400Regular', fontSize:14 },
  codeInput:        { width:'100%', backgroundColor:C.card, borderRadius:14, borderWidth:1.5, borderColor:C.accent, padding:16, color:C.accent, fontFamily:'Nunito_900Black', fontSize:22, textAlign:'center', letterSpacing:6 },
  commentBar:       { flexDirection:'row', gap:10, padding:14, backgroundColor:C.card, borderTopWidth:1, borderTopColor:C.cardBorder, alignItems:'flex-end' },
  commentInput:     { flex:1, backgroundColor:C.cardAlt, borderRadius:12, padding:12, color:C.text, fontFamily:'Nunito_400Regular', fontSize:13, maxHeight:80 },
  sendBtn:          { width:44, height:44, borderRadius:13, alignItems:'center', justifyContent:'center' },
  sendBtnText:      { color:C.bg, fontSize:16, fontFamily:'Nunito_800ExtraBold' },

  bottomNav:        { height:64, backgroundColor:C.card, borderTopWidth:1, borderTopColor:C.cardBorder, flexDirection:'row', alignItems:'center', justifyContent:'space-around', paddingBottom:4 },
  navTab:           { alignItems:'center', gap:2, paddingHorizontal:10 },
  navDot:           { width:3, height:3, borderRadius:99, backgroundColor:'transparent', marginBottom:1 },
  navDotOn:         { backgroundColor:C.accent },
  navIcon:          { fontSize:17, color:C.dim },
  navLabel:         { fontSize:8, fontFamily:'Nunito_400Regular', color:C.dim, letterSpacing:0.5 },
  badge:            { position:'absolute', top:-6, right:-8, backgroundColor:C.danger, borderRadius:99, minWidth:16, height:16, alignItems:'center', justifyContent:'center', paddingHorizontal:3 },
  badgeText:        { fontSize:8, fontFamily:'Nunito_800ExtraBold', color:'white' },

  splashGlow:       { position:'absolute', top:80, width:200, height:200, borderRadius:100, backgroundColor:`${C.accent}10` },
  splashTitle:      { fontSize:38, fontFamily:'PlayfairDisplay_700Bold', color:C.text, textAlign:'center', marginTop:20 },
  splashTagline:    { fontSize:14, fontFamily:'PlayfairDisplay_400Regular_Italic', color:C.muted, marginTop:12, textAlign:'center' },
  splashGreeting:   { position:'absolute', bottom:40, fontSize:11, fontFamily:'Nunito_400Regular', color:C.dim, letterSpacing:1 },

  roleCard:         { flexDirection:'row', alignItems:'center', gap:14, borderWidth:1.5, borderRadius:18, padding:18, marginBottom:12, marginTop:20 },
  roleIcon:         { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center' },
  roleTitle:        { fontFamily:'Nunito_800ExtraBold', fontSize:15, color:C.text },
  roleSub:          { fontFamily:'Nunito_400Regular', fontSize:12, color:C.muted, marginTop:3 },
  textRow:          { flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:C.cardBorder, borderRadius:12, padding:14, marginBottom:8 },
  textRowLabel:     { color:C.muted, fontSize:13, fontFamily:'Nunito_400Regular' },

  homeAvatar:       { width:48, height:48, borderRadius:14, backgroundColor:C.cardAlt, borderWidth:1, borderColor:C.cardBorder, alignItems:'center', justifyContent:'center' },
  profileAvatar:    { width:64, height:64, borderRadius:20, alignItems:'center', justifyContent:'center', marginTop:16 },

  passageBook:      { fontSize:11, fontFamily:'Nunito_700Bold', color:C.dim, letterSpacing:1, textTransform:'uppercase', marginTop:10 },
  passageRef:       { fontSize:36, fontFamily:'PlayfairDisplay_700Bold', color:C.text, lineHeight:42, marginTop:2 },
  passageDesc:      { fontSize:13, fontFamily:'PlayfairDisplay_400Regular_Italic', color:C.muted, marginTop:6 },
  progressSeg:      { flex:1, height:3, borderRadius:99 },

  weekTabsWrap:     { paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.ultraDim },
  weekTab:          { backgroundColor:C.cardAlt, borderRadius:10, paddingVertical:7, paddingHorizontal:14, marginRight:8 },
  weekTabOn:        { backgroundColor:C.accent },
  weekTabText:      { fontSize:12, fontFamily:'Nunito_700Bold', color:C.muted },
  dayCard:          { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.cardBorder, borderRadius:16, padding:14 },
  dayCheck:         { width:28, height:28, borderRadius:8, alignItems:'center', justifyContent:'center', flexShrink:0 },
  dayTitle:         { fontFamily:'Nunito_800ExtraBold', fontSize:13, color:C.text },
  todayBadge:       { backgroundColor:C.accent, borderRadius:6, paddingHorizontal:7, paddingVertical:1 },
  todayBadgeText:   { fontSize:9, fontFamily:'Nunito_800ExtraBold', color:C.bg },

  roleBadge:        { backgroundColor:`${C.accent}18`, borderRadius:6, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:`${C.accent}30` },
  roleBadgeText:    { fontSize:9, fontFamily:'Nunito_800ExtraBold', color:C.accent, letterSpacing:1 },
  histDot:          { width:28, height:28, borderRadius:8, alignItems:'center', justifyContent:'center' },

  bibleHeader:      { paddingHorizontal:24, paddingTop:12, paddingBottom:12, borderBottomWidth:1, borderBottomColor:C.ultraDim, backgroundColor:C.bg },
  bibleBookSm:      { fontSize:11, fontFamily:'Nunito_700Bold', color:C.dim, letterSpacing:1, textTransform:'uppercase' },
  bibleChBig:       { fontSize:40, fontFamily:'PlayfairDisplay_700Bold', color:C.text, lineHeight:46, marginTop:2 },
  pill:             { borderWidth:1, borderColor:C.cardBorder, borderRadius:8, paddingVertical:6, paddingHorizontal:12 },
  pillOn:           { backgroundColor:C.accent, borderColor:C.accent },
  pillText:         { fontSize:11, fontFamily:'Nunito_700Bold', color:C.muted },
  pickerPill:       { backgroundColor:C.cardAlt, borderWidth:1, borderColor:C.cardBorder, borderRadius:10, paddingVertical:8, paddingHorizontal:12 },
  chInput:          { width:56, backgroundColor:C.cardAlt, borderWidth:1, borderColor:C.cardBorder, borderRadius:10, paddingVertical:8, paddingHorizontal:10, color:C.text, fontFamily:'Nunito_400Regular', fontSize:13, textAlign:'center' },
  verseRow:         { flexDirection:'row', gap:12, paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderLeftWidth:3, borderLeftColor:'transparent', marginBottom:2 },
  verseNum:         { color:C.accent, fontFamily:'Nunito_800ExtraBold', fontSize:10, minWidth:20, marginTop:4 },
  verseText:        { flex:1, fontSize:15, fontFamily:'Nunito_400Regular', color:C.text, lineHeight:28 },

  annotToggleRow:   { flexDirection:'row', gap:8, marginTop:12 },
  annotTab:         { flex:1, paddingVertical:7, borderRadius:10, backgroundColor:C.cardAlt, alignItems:'center', borderWidth:1, borderColor:C.cardBorder },
  annotTabOn:       { backgroundColor:C.accent, borderColor:C.accent },
  annotTabText:     { fontSize:11, fontFamily:'Nunito_700Bold', color:C.muted },
  annotDot:         { width:4, height:4, borderRadius:99, backgroundColor:C.accent },
  hlDot:            { width:4, height:4, borderRadius:99 },
  annotCard:        { marginLeft:32, marginBottom:8, backgroundColor:`${C.accent}08`, borderRadius:10, padding:10, borderLeftWidth:2, borderLeftColor:C.accent },

  modalOverlay:     { flex:1, backgroundColor:'rgba(0,0,0,0.6)' },
  modalSheet:       { backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40, borderWidth:1, borderColor:C.cardBorder },
  modalVerseRef:    { fontSize:18, fontFamily:'PlayfairDisplay_700Bold', color:C.text },
  toggleRow:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:C.cardAlt, borderRadius:12, padding:14, borderWidth:1, borderColor:C.cardBorder },

  highlightSheet:   { backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40, borderWidth:1, borderColor:C.cardBorder },
  colorDot:         { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },

  emptyWrap:        { alignItems:'center', justifyContent:'center', padding:28 },
  emptyIcon:        { fontSize:36, marginBottom:10, opacity:0.5 },
  emptyTitle:       { fontSize:15, fontFamily:'Nunito_800ExtraBold', color:C.text, marginBottom:6, textAlign:'center' },
  emptySubtitle:    { fontSize:12, fontFamily:'Nunito_400Regular', color:C.muted, textAlign:'center', lineHeight:18 },
});