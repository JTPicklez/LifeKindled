// ═══════════════════════════════════════════════════════════════════
//  LifeKindled 2.0
//  "A Bible built for community."
//  The Bible is the campfire. Every feature gathers people around it.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList, Alert, StatusBar, Modal, Switch,
  Animated, Image, RefreshControl, Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Slider from '@react-native-community/slider';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  PlayfairDisplay_700Bold, PlayfairDisplay_400Regular, PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, getDoc, collection, addDoc, query, where, onSnapshot, orderBy,
  updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, deleteDoc, limit,
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

// ─── FIREBASE ──────────────────────────────────────────────────────
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
const db = getApps().length === 1
  ? initializeFirestore(fbApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : getFirestore(fbApp);

const LAST_READ_KEY  = 'lk_last_read';
const RECENT_KEY     = 'lk_recently_read';
const SETTINGS_KEY   = 'lk_settings';

// ═══════════════════════════════════════════════════════════════════
//  DESIGN SYSTEM
//  Foundation: deep navy. Identity: gold.
//  Tertiaries carry meaning — teal = shared, violet = live/pinned,
//  sage = prayer & completion. Nothing is decorative only.
// ═══════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    // base — deep navy, not black
    abyss:    '#060D18',
    deep:     '#0B1524',
    surface:  '#111E32',
    raised:   '#182842',
    line:     '#223550',
    hairline: '#16233A',
    // identity
    gold:     '#F5A623',
    ember:    '#E07B39',
    flame:    '#FFCE6B',
    // meaning
    tide:     '#45C7BE',  // shared / community layer
    amethyst: '#9B7BFF',  // study rooms, pinned leader notes
    sage:     '#5FCF95',  // prayer, answered, completed
    rose:     '#F26D78',  // destructive
    // type
    parchment:'#F1EADC',  // scripture
    text:     '#E3E9F3',
    muted:    '#8494B0',
    dim:      '#4E5F7D',
    scrim:    'rgba(3,8,16,0.72)',
    isDark:   true,
  },
  light: {
    abyss:    '#F7F5F0',
    deep:     '#FFFFFF',
    surface:  '#FFFFFF',
    raised:   '#F1EEE7',
    line:     '#E2DCD1',
    hairline: '#EDE8DE',
    gold:     '#C4830F',
    ember:    '#B75F22',
    flame:    '#E0A63C',
    tide:     '#1E9189',
    amethyst: '#6D4BD1',
    sage:     '#2F9463',
    rose:     '#C8434F',
    parchment:'#221C12',
    text:     '#151C28',
    muted:    '#5F6B80',
    dim:      '#95A0B2',
    scrim:    'rgba(20,24,32,0.45)',
    isDark:   false,
  },
};

// Type roles — display carries reverence, body carries clarity
const F = {
  scripture:     'PlayfairDisplay_400Regular',
  scriptureItal: 'PlayfairDisplay_400Regular_Italic',
  display:       'PlayfairDisplay_700Bold',
  body:          'Nunito_400Regular',
  medium:        'Nunito_600SemiBold',
  bold:          'Nunito_700Bold',
  heavy:         'Nunito_800ExtraBold',
  black:         'Nunito_900Black',
};

// ─── SETTINGS CONTEXT ──────────────────────────────────────────────
const SettingsContext = createContext();

function SettingsProvider({ children }) {
  const [theme, setTheme]         = useState('dark');
  const [fontSize, setFontSize]   = useState(17);
  const [serifMode, setSerifMode] = useState(true);
  const [loaded, setLoaded]       = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (raw) {
        try {
          const s = JSON.parse(raw);
          if (s.theme) setTheme(s.theme);
          if (s.fontSize) setFontSize(s.fontSize);
          if (s.serifMode !== undefined) setSerifMode(s.serifMode);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme, fontSize, serifMode }));
  }, [theme, fontSize, serifMode, loaded]);

  const C = THEMES[theme];
  return (
    <SettingsContext.Provider value={{ theme, setTheme, fontSize, setFontSize, serifMode, setSerifMode, C, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}
const useSettings = () => useContext(SettingsContext);

// ─── AVATARS ───────────────────────────────────────────────────────
const AVATARS = [
  { id:'flame',  emoji:'🔥', label:'Flame'  },
  { id:'dove',   emoji:'🕊️', label:'Dove'   },
  { id:'cross',  emoji:'✝️', label:'Cross'  },
  { id:'church', emoji:'⛪', label:'Church' },
  { id:'bible',  emoji:'📖', label:'Bible'  },
  { id:'prayer', emoji:'🙏', label:'Prayer' },
  { id:'lamb',   emoji:'🐑', label:'Lamb'   },
  { id:'crown',  emoji:'👑', label:'Crown'  },
  { id:'heart',  emoji:'❤️', label:'Heart'  },
  { id:'star',   emoji:'⭐', label:'Star'   },
  { id:'olive',  emoji:'🌿', label:'Olive'  },
  { id:'candle', emoji:'🕯️', label:'Candle' },
];
const getAvatar = id => AVATARS.find(a => a.id === id) || AVATARS[0];

// Frames are earned, never bought with status — they mark journey, not rank
const FRAMES = {
  none:    { id:'none',    label:'None',       ring:null,        req:0   },
  kindled: { id:'kindled', label:'Kindled',    ring:'gold',      req:7   },
  steady:  { id:'steady',  label:'Steady',     ring:'tide',      req:30  },
  rooted:  { id:'rooted',  label:'Rooted',     ring:'sage',      req:100 },
  faithful:{ id:'faithful',label:'Faithful',   ring:'amethyst',  req:365 },
};
function frameForStreak(longest = 0) {
  if (longest >= 365) return FRAMES.faithful;
  if (longest >= 100) return FRAMES.rooted;
  if (longest >= 30)  return FRAMES.steady;
  if (longest >= 7)   return FRAMES.kindled;
  return FRAMES.none;
}

// ─── ANNOTATION VISIBILITY ─────────────────────────────────────────
const VISIBILITY = [
  { id:'private', label:'Only Me',    icon:'lock-closed-outline', tone:'muted', blurb:'A private note in your Bible' },
  { id:'friends', label:'Friends',    icon:'people-outline',      tone:'tide',  blurb:'Visible to your friends'      },
  { id:'group',   label:'Group',      icon:'home-outline',        tone:'gold',  blurb:'Visible inside one group'     },
  { id:'plan',    label:'Reading Plan',icon:'book-outline',       tone:'ember', blurb:'Visible to plan members'      },
  { id:'public',  label:'Public',     icon:'globe-outline',       tone:'sage',  blurb:'Visible to the community'     },
];
const visMeta = id => VISIBILITY.find(v => v.id === id) || VISIBILITY[0];

// Understated on purpose — appreciation, not a popularity contest
const REACTIONS = [
  { id:'encouraged', emoji:'❤️', label:'Encouraged me' },
  { id:'praying',    emoji:'🙏', label:'Praying'       },
  { id:'helpful',    emoji:'💡', label:'Helpful'       },
];

const HIGHLIGHT_COLORS = [
  { color:'#F5A623', label:'Gold'   },
  { color:'#45C7BE', label:'Tide'   },
  { color:'#5FCF95', label:'Sage'   },
  { color:'#9B7BFF', label:'Violet' },
  { color:'#E07B39', label:'Ember'  },
];

// ═══════════════════════════════════════════════════════════════════
//  SCRIPTURE
// ═══════════════════════════════════════════════════════════════════
const APIBIBLE_KEY  = 'lKCHhc4EhmNnSBsnNwBpa';
const APIBIBLE_BASE = 'https://rest.api.bible/v1';
const BIBLE_IDS = {
  nlt:'d6e14a625393b4da-01', nkjv:'63097d2a0a2f7db3-01',
  csb:'a556c5305ee15c3f-01', kjv:'de4e12af7f28f599-01',
};
const TRANSLATIONS = ['nlt','nkjv','csb','kjv'];
const TRANSLATION_LABELS = { nlt:'NLT', nkjv:'NKJV', csb:'CSB', kjv:'KJV' };

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
const BOOK_CODES = [
  'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR',
  'NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO',
  'OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM',
  '1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM',
  'HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV',
];
const OT_COUNT = 39; // index < 39 = Old Testament

const CHAPTER_COUNTS = {
  'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,
  'Joshua':24,'Judges':21,'Ruth':4,'1 Samuel':31,'2 Samuel':24,
  '1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,
  'Ezra':10,'Nehemiah':13,'Esther':10,'Job':42,'Psalms':150,
  'Proverbs':31,'Ecclesiastes':12,'Song of Solomon':8,'Isaiah':66,
  'Jeremiah':52,'Lamentations':5,'Ezekiel':48,'Daniel':12,
  'Hosea':14,'Joel':3,'Amos':9,'Obadiah':1,'Jonah':4,'Micah':7,
  'Nahum':3,'Habakkuk':3,'Zephaniah':3,'Haggai':2,'Zechariah':14,'Malachi':4,
  'Matthew':28,'Mark':16,'Luke':24,'John':21,'Acts':28,'Romans':16,
  '1 Corinthians':16,'2 Corinthians':13,'Galatians':6,'Ephesians':6,
  'Philippians':4,'Colossians':4,'1 Thessalonians':5,'2 Thessalonians':3,
  '1 Timothy':6,'2 Timothy':4,'Titus':3,'Philemon':1,'Hebrews':13,
  'James':5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,'3 John':1,
  'Jude':1,'Revelation':22,
};

const getBookCode = name => {
  const i = BOOKS.indexOf(name);
  return i >= 0 ? BOOK_CODES[i] : null;
};

const passageCache = {};

async function fetchPassage(book, chapter, translation = 'nlt') {
  const key = `${translation}:${book}:${chapter}`;
  if (passageCache[key]) return passageCache[key];
  try {
    const bibleId  = BIBLE_IDS[translation];
    const bookCode = getBookCode(book);
    if (!bibleId || !bookCode) return null;
    const url = `${APIBIBLE_BASE}/bibles/${bibleId}/chapters/${bookCode}.${chapter}` +
      `?content-type=text&include-notes=false&include-titles=false` +
      `&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`;
    const res  = await fetch(url, { headers: { 'api-key': APIBIBLE_KEY } });
    const data = await res.json();
    if (!data?.data?.content) return null;
    const rx = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
    const verses = [];
    let m;
    while ((m = rx.exec(data.data.content)) !== null) {
      const text = m[2].replace(/\s+/g, ' ').trim();
      if (text) verses.push({ verse: parseInt(m[1]), text });
    }
    if (!verses.length) return null;
    const out = { verses };
    passageCache[key] = out;
    return out;
  } catch (e) { console.warn('fetchPassage', e); return null; }
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
const todayStr   = () => new Date().toISOString().split('T')[0];
const verseKey   = (b, c, v) => `${b}_${c}_${v}`;
const uidOf      = () => auth.currentUser?.uid ?? '';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const d = (Date.now() - ts.toDate().getTime()) / 1000;
  if (d < 60)    return 'just now';
  if (d < 3600)  return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800)return `${Math.floor(d / 86400)}d`;
  return ts.toDate().toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function fmtDate(s) {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}
function fmtClock(s) {
  return `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;
}
function inviteCode() {
  const w = ['KINDLE','FLAME','LIGHT','GRACE','FAITH','TRUTH','HOPE','RISEN','ANCHOR','CEDAR'];
  return `${w[Math.floor(Math.random() * w.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Parse "John 3:1-21" / "1 Corinthians 13" into { book, chapter }
function parseRef(ref) {
  if (!ref) return null;
  const m = ref.trim().match(/^((?:[1-3]\s)?[A-Za-z ]+?)\s+(\d+)/);
  if (!m) return null;
  const book = BOOKS.find(b => b.toLowerCase() === m[1].trim().toLowerCase());
  return book ? { book, chapter: m[2] } : null;
}

// ─── LAST READ / RECENTS ───────────────────────────────────────────
async function saveLastRead(book, chapter, translation) {
  try {
    await AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify({ book, chapter, translation }));
    const raw  = await AsyncStorage.getItem(RECENT_KEY);
    const hist = raw ? JSON.parse(raw) : [];
    const next = [{ book, chapter, ts: Date.now() }, ...hist.filter(h => !(h.book === book && h.chapter === chapter))];
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, 8)));
  } catch {}
}
async function getLastRead() {
  try { const r = await AsyncStorage.getItem(LAST_READ_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
async function getRecents() {
  try { const r = await AsyncStorage.getItem(RECENT_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

// ─── STREAKS ───────────────────────────────────────────────────────
async function logHabit(userId, type, duration = 0) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'habits'), {
      userId, type, date: todayStr(), duration, createdAt: serverTimestamp(),
    });
    await recalcStreak(userId);
  } catch (e) { console.warn('logHabit', e); }
}

async function recalcStreak(userId) {
  try {
    const snap = await getDocs(query(collection(db, 'habits'), where('userId','==',userId)));
    const days = new Set(snap.docs.map(d => d.data().date));
    let streak = 0, longest = 0, run = 0;
    let cur = new Date();
    if (!days.has(todayStr())) cur.setDate(cur.getDate() - 1);
    while (days.has(cur.toISOString().split('T')[0])) {
      streak++; cur.setDate(cur.getDate() - 1);
    }
    const sorted = [...days].sort();
    sorted.forEach((d, i) => {
      if (i === 0) { run = 1; return; }
      const gap = (new Date(d) - new Date(sorted[i-1])) / 86400000;
      run = gap === 1 ? run + 1 : 1;
      if (run > longest) longest = run;
    });
    if (streak > longest) longest = streak;
    await updateDoc(doc(db,'users',userId), {
      currentStreak: streak, longestStreak: longest, lastActivityDate: todayStr(),
    });
  } catch (e) { console.warn('recalcStreak', e); }
}

// ─── USERNAMES ─────────────────────────────────────────────────────
const usernameValid = u => /^[a-z0-9_.]{3,20}$/.test(u);

async function usernameAvailable(u) {
  try { return !(await getDoc(doc(db,'usernames',u.toLowerCase()))).exists(); }
  catch { return false; }
}
async function claimUsername(u, uid) {
  try { await setDoc(doc(db,'usernames',u.toLowerCase()), { uid, createdAt: serverTimestamp() }); return true; }
  catch { return false; }
}
async function searchUsers(term, selfUid) {
  try {
    const t = term.toLowerCase().replace(/^@/,'');
    if (t.length < 2) return [];
    const snap = await getDocs(collection(db,'usernames'));
    const hits = snap.docs.filter(d => d.id.startsWith(t)).slice(0, 12);
    const users = await Promise.all(hits.map(async h => {
      const s = await getDoc(doc(db,'users',h.data().uid));
      return s.exists() ? { uid: h.data().uid, ...s.data() } : null;
    }));
    return users.filter(u => u && u.uid !== selfUid);
  } catch { return []; }
}

// ─── FRIENDS (mutual, never followers) ─────────────────────────────
async function sendFriendRequest(fromUid, toUid, fromName) {
  if (!fromUid || !toUid || fromUid === toUid) return;
  try {
    await setDoc(doc(db,'friendRequests',`${fromUid}_${toUid}`), {
      fromUid, toUid, status:'pending', createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db,'users',toUid), { pendingRequests: arrayUnion(fromUid) });
    await pushNotification(toUid, {
      type:'friendRequest', title:'New friend request',
      body:`${fromName || 'Someone'} wants to read alongside you`, actorUid: fromUid,
    });
  } catch (e) { console.warn('sendFriendRequest', e); }
}
async function acceptFriendRequest(fromUid, toUid, toName) {
  try {
    await updateDoc(doc(db,'friendRequests',`${fromUid}_${toUid}`), { status:'accepted' });
    await updateDoc(doc(db,'users',toUid),   { friends: arrayUnion(fromUid), pendingRequests: arrayRemove(fromUid) });
    await updateDoc(doc(db,'users',fromUid), { friends: arrayUnion(toUid) });
    await pushNotification(fromUid, {
      type:'friendAccepted', title:'Friend request accepted',
      body:`${toName || 'Someone'} accepted your request`, actorUid: toUid,
    });
  } catch (e) { console.warn('acceptFriendRequest', e); }
}
async function declineFriendRequest(fromUid, toUid) {
  try {
    await updateDoc(doc(db,'friendRequests',`${fromUid}_${toUid}`), { status:'declined' });
    await updateDoc(doc(db,'users',toUid), { pendingRequests: arrayRemove(fromUid) });
  } catch (e) { console.warn('declineFriendRequest', e); }
}
async function removeFriend(a, b) {
  try {
    await updateDoc(doc(db,'users',a), { friends: arrayRemove(b) });
    await updateDoc(doc(db,'users',b), { friends: arrayRemove(a) });
    await deleteDoc(doc(db,'friendRequests',`${a}_${b}`)).catch(()=>{});
    await deleteDoc(doc(db,'friendRequests',`${b}_${a}`)).catch(()=>{});
  } catch (e) { console.warn('removeFriend', e); }
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────
// Gentle invitations back to Scripture — never an anxiety feed.
async function pushNotification(toUid, payload) {
  if (!toUid) return;
  try {
    await addDoc(collection(db,'notifications'), {
      toUid, read:false, createdAt: serverTimestamp(), ...payload,
    });
  } catch (e) { console.warn('pushNotification', e); }
}

// ═══════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Screen({ children, scroll, refreshing, onRefresh, pad = true, edges = ['top'] }) {
  const { C } = useSettings();
  const body = pad ? <View style={S(C).pad}>{children}</View> : children;
  if (scroll) {
    return (
      <SafeAreaView style={S(C).safe} edges={edges}>
        <ScrollView
          style={{ flex:1 }}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh
            ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.gold} colors={[C.gold]} />
            : undefined}
        >
          {body}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return <SafeAreaView style={S(C).safe} edges={edges}>{body}</SafeAreaView>;
}

function GoldButton({ label, onPress, style, loading, icon, disabled }) {
  const { C } = useSettings();
  return (
    <TouchableOpacity onPress={onPress} style={style} activeOpacity={0.85} disabled={loading || disabled}>
      <LinearGradient
        colors={disabled ? [C.raised, C.raised] : [C.gold, C.ember]}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }}
        style={S(C).goldBtn}
      >
        {loading
          ? <ActivityIndicator color={C.abyss} size="small" />
          : (
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              {icon ? <Ionicons name={icon} size={17} color={disabled ? C.dim : C.abyss} /> : null}
              <Text style={[S(C).goldBtnTxt, disabled && { color:C.dim }]}>{label}</Text>
            </View>
          )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function GhostButton({ label, onPress, style, tone, icon, loading }) {
  const { C } = useSettings();
  const col = tone ? C[tone] : C.gold;
  return (
    <TouchableOpacity onPress={onPress} disabled={loading}
      style={[S(C).ghostBtn, { borderColor: col + '55', backgroundColor: col + '10' }, style]}>
      {loading ? <ActivityIndicator color={col} size="small" /> : (
        <View style={{ flexDirection:'row', alignItems:'center', gap:7 }}>
          {icon ? <Ionicons name={icon} size={16} color={col} /> : null}
          <Text style={[S(C).ghostBtnTxt, { color: col }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress, tone, icon, small }) {
  const { C } = useSettings();
  const col = tone ? C[tone] : C.gold;
  return (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={{
        flexDirection:'row', alignItems:'center', gap:6,
        paddingVertical: small ? 6 : 8, paddingHorizontal: small ? 11 : 14,
        borderRadius: 999, borderWidth:1,
        borderColor: active ? col : C.line,
        backgroundColor: active ? col + '1E' : 'transparent',
      }}>
      {icon ? <Ionicons name={icon} size={small ? 12 : 14} color={active ? col : C.muted} /> : null}
      <Text style={{ fontFamily:F.bold, fontSize: small ? 11.5 : 13, color: active ? col : C.muted }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Section marker — the bar encodes the section's meaning color
function Section({ children, tone, right }) {
  const { C } = useSettings();
  const col = tone ? C[tone] : C.gold;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
      <View style={{ width:3, height:13, borderRadius:99, backgroundColor: col, marginRight:9 }} />
      <Text style={{ fontFamily:F.heavy, fontSize:10, letterSpacing:1.8, color:C.muted, textTransform:'uppercase', flex:1 }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

function Header({ title, sub, onBack, right }) {
  const { C } = useSettings();
  return (
    <View style={{ marginTop:14, marginBottom:14 }}>
      {onBack && (
        <TouchableOpacity onPress={onBack} hitSlop={{top:10,bottom:10,left:10,right:10}}
          style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:10 }}>
          <Ionicons name="chevron-back" size={17} color={C.gold} />
          <Text style={{ color:C.gold, fontFamily:F.bold, fontSize:14 }}>Back</Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between' }}>
        <View style={{ flex:1 }}>
          <Text style={S(C).h1}>{title}</Text>
          <View style={S(C).rule} />
        </View>
        {right}
      </View>
      {sub ? <Text style={[S(C).muted, { marginTop:10, lineHeight:19 }]}>{sub}</Text> : null}
    </View>
  );
}

function Card({ children, style, tone, onPress }) {
  const { C } = useSettings();
  const base = [S(C).card, tone && { borderColor: C[tone] + '3A', backgroundColor: C[tone] + '0C' }, style];
  if (onPress) return <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={base}>{children}</TouchableOpacity>;
  return <View style={base}>{children}</View>;
}

function Empty({ icon, title, body, action }) {
  const { C } = useSettings();
  return (
    <View style={{ alignItems:'center', paddingVertical:36, paddingHorizontal:24 }}>
      <View style={{
        width:56, height:56, borderRadius:20, alignItems:'center', justifyContent:'center',
        backgroundColor: C.raised, borderWidth:1, borderColor: C.line, marginBottom:14,
      }}>
        <Text style={{ fontSize:24 }}>{icon}</Text>
      </View>
      <Text style={{ fontFamily:F.heavy, fontSize:15, color:C.text, textAlign:'center' }}>{title}</Text>
      <Text style={[S(C).muted, { textAlign:'center', marginTop:6, lineHeight:19, maxWidth:280 }]}>{body}</Text>
      {action ? <View style={{ marginTop:16 }}>{action}</View> : null}
    </View>
  );
}

function Avatar({ user, size = 44, frame = true }) {
  const { C } = useSettings();
  const a  = getAvatar(user?.avatarId);
  const fr = frame ? frameForStreak(user?.longestStreak || 0) : FRAMES.none;
  const ringColor = fr.ring ? C[fr.ring] : 'transparent';
  return (
    <View style={{
      width:size, height:size, borderRadius:size * 0.33,
      alignItems:'center', justifyContent:'center',
      backgroundColor: C.raised,
      borderWidth: fr.ring ? 2 : 1,
      borderColor: fr.ring ? ringColor : C.line,
    }}>
      <Text style={{ fontSize: size * 0.46 }}>{a.emoji}</Text>
    </View>
  );
}

function Sheet({ visible, onClose, children, maxHeight = '86%' }) {
  const { C } = useSettings();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex:1, backgroundColor:C.scrim }} activeOpacity={1} onPress={onClose} />
      <View style={[S(C).sheet, { maxHeight }]}>
        <View style={S(C).grabber} />
        {children}
      </View>
    </Modal>
  );
}

function Skeleton({ w = '100%', h = 14, style }) {
  const { C } = useSettings();
  const o = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue:0.6, duration:800, useNativeDriver:true }),
      Animated.timing(o, { toValue:0.25, duration:800, useNativeDriver:true }),
    ]));
    a.start(); return () => a.stop();
  }, []);
  return <Animated.View style={[{ width:w, height:h, borderRadius:7, backgroundColor:C.raised, opacity:o }, style]} />;
}

function ScriptureSkeleton() {
  return (
    <View style={{ paddingHorizontal:26, paddingTop:22, gap:15 }}>
      <Skeleton w="48%" h={20} />
      <View style={{ height:6 }} />
      {['94%','88%','96%','82%','91%','76%','89%','93%'].map((w,i) => <Skeleton key={i} w={w} h={15} />)}
    </View>
  );
}

// ─── AVATAR PICKER ─────────────────────────────────────────────────
function AvatarPicker({ visible, current, onSelect, onClose }) {
  const { C } = useSettings();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={S(C).sheetTitle}>Choose your avatar</Text>
      <Text style={[S(C).muted, { marginBottom:20 }]}>This is how friends recognize you.</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:14, justifyContent:'center' }}>
        {AVATARS.map(a => {
          const on = current === a.id;
          return (
            <TouchableOpacity key={a.id}
              onPress={() => { Haptics.selectionAsync(); onSelect(a.id); }}
              style={{
                width:62, height:62, borderRadius:20, alignItems:'center', justifyContent:'center',
                backgroundColor: on ? C.gold + '1E' : C.raised,
                borderWidth:2, borderColor: on ? C.gold : C.line,
              }}>
              <Text style={{ fontSize:27 }}>{a.emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <GhostButton label="Done" onPress={onClose} style={{ marginTop:24 }} />
    </Sheet>
  );
}

// ─── QR SCANNER ────────────────────────────────────────────────────
function QRScanner({ visible, onClose, onScanned }) {
  const { C } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) { setScanned(false); if (!permission?.granted) requestPermission(); }
  }, [visible]);

  if (!visible) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'#04080F' }}>
        <View style={{ paddingTop:58, paddingHorizontal:22, paddingBottom:14,
          flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <View>
            <Text style={{ color:'#FFF', fontFamily:F.heavy, fontSize:17 }}>Scan to connect</Text>
            <Text style={{ color:'#7C8CA8', fontFamily:F.body, fontSize:12, marginTop:2 }}>
              Point at a LifeKindled code
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{top:12,bottom:12,left:12,right:12}}>
            <Ionicons name="close" size={27} color="#FFF" />
          </TouchableOpacity>
        </View>

        {!permission?.granted ? (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:34 }}>
            <Text style={{ fontSize:38, marginBottom:14 }}>📷</Text>
            <Text style={{ color:'#FFF', textAlign:'center', fontFamily:F.bold, fontSize:15, marginBottom:8 }}>
              Camera access needed
            </Text>
            <Text style={{ color:'#7C8CA8', textAlign:'center', fontFamily:F.body, fontSize:13, marginBottom:22, lineHeight:19 }}>
              LifeKindled uses your camera only to scan connection codes.
            </Text>
            <TouchableOpacity onPress={requestPermission}
              style={{ backgroundColor:C.gold, borderRadius:14, paddingVertical:13, paddingHorizontal:28 }}>
              <Text style={{ color:'#04080F', fontFamily:F.heavy }}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={{ flex:1 }} facing="back"
            barcodeScannerSettings={{ barcodeTypes:['qr'] }}
            onBarcodeScanned={scanned ? undefined : ({ data }) => { setScanned(true); onScanned(data); }}
          >
            <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
              <View style={{ width:246, height:246, borderRadius:28, borderWidth:2.5, borderColor:C.gold }} />
            </View>
          </CameraView>
        )}
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  THE BIBLE  —  home. everything else orbits this.
// ═══════════════════════════════════════════════════════════════════

function BookPicker({ visible, current, onPick, onClose }) {
  const { C } = useSettings();
  const [testament, setTestament] = useState(BOOKS.indexOf(current) < OT_COUNT ? 'ot' : 'nt');
  const [chapterFor, setChapterFor] = useState(null);
  const list = testament === 'ot' ? BOOKS.slice(0, OT_COUNT) : BOOKS.slice(OT_COUNT);

  useEffect(() => { if (visible) setChapterFor(null); }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      {!chapterFor ? (
        <>
          <Text style={S(C).sheetTitle}>Books of the Bible</Text>
          <View style={{ flexDirection:'row', gap:8, marginTop:14, marginBottom:16 }}>
            <Chip label="Old Testament" active={testament==='ot'} onPress={() => setTestament('ot')} />
            <Chip label="New Testament" active={testament==='nt'} onPress={() => setTestament('nt')} tone="tide" />
          </View>
          <ScrollView style={{ maxHeight:400 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, paddingBottom:20 }}>
              {list.map(b => (
                <TouchableOpacity key={b} onPress={() => { Haptics.selectionAsync(); setChapterFor(b); }}
                  style={{
                    paddingVertical:10, paddingHorizontal:14, borderRadius:12,
                    backgroundColor: b === current ? C.gold + '1C' : C.raised,
                    borderWidth:1, borderColor: b === current ? C.gold : C.line,
                  }}>
                  <Text style={{ fontFamily:F.medium, fontSize:13, color: b === current ? C.gold : C.text }}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          <TouchableOpacity onPress={() => setChapterFor(null)}
            style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:12 }}>
            <Ionicons name="chevron-back" size={16} color={C.gold} />
            <Text style={{ color:C.gold, fontFamily:F.bold, fontSize:13 }}>All books</Text>
          </TouchableOpacity>
          <Text style={S(C).sheetTitle}>{chapterFor}</Text>
          <Text style={[S(C).muted, { marginBottom:16 }]}>
            {CHAPTER_COUNTS[chapterFor]} chapters
          </Text>
          <ScrollView style={{ maxHeight:380 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, paddingBottom:20 }}>
              {Array.from({ length: CHAPTER_COUNTS[chapterFor] || 1 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n}
                  onPress={() => { Haptics.selectionAsync(); onPick(chapterFor, String(n)); onClose(); }}
                  style={{
                    width:48, height:44, borderRadius:12, alignItems:'center', justifyContent:'center',
                    backgroundColor: C.raised, borderWidth:1, borderColor: C.line,
                  }}>
                  <Text style={{ fontFamily:F.bold, fontSize:14, color:C.text }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </Sheet>
  );
}

// ─── VERSE ACTION SHEET ────────────────────────────────────────────
// Never covers more Scripture than it has to.
function VerseSheet({ visible, verse, book, chapter, user, highlight, onClose, onHighlight, onClearHighlight, onNote, onAnnotate, onPray, sharedCount, onViewShared }) {
  const { C } = useSettings();
  if (!verse) return null;
  const ref = `${book} ${chapter}:${verse.verse}`;

  const actions = [
    { icon:'create-outline',        label:'Private note',   tone:'muted',    onPress: onNote },
    { icon:'chatbubbles-outline',   label:'Share a thought',tone:'tide',     onPress: onAnnotate },
    { icon:'hand-left-outline',     label:'Pray this verse',tone:'sage',     onPress: onPray },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} maxHeight="72%">
      <Text style={{ fontFamily:F.display, fontSize:19, color:C.gold }}>{ref}</Text>
      <Text style={{ fontFamily:F.scriptureItal, fontSize:14, color:C.muted, marginTop:7, lineHeight:22 }} numberOfLines={3}>
        {verse.text?.trim()}
      </Text>

      <View style={{ height:1, backgroundColor:C.hairline, marginVertical:18 }} />

      <Section tone="gold">Highlight</Section>
      <View style={{ flexDirection:'row', gap:11, marginBottom:6 }}>
        {HIGHLIGHT_COLORS.map(h => {
          const on = highlight === h.color;
          return (
            <TouchableOpacity key={h.color} onPress={() => onHighlight(verse, h.color)}
              style={{
                width:40, height:40, borderRadius:20, backgroundColor:h.color,
                alignItems:'center', justifyContent:'center',
                borderWidth: on ? 3 : 0, borderColor: C.parchment,
              }}>
              {on ? <Ionicons name="checkmark" size={17} color="#FFF" /> : null}
            </TouchableOpacity>
          );
        })}
        {highlight ? (
          <TouchableOpacity onPress={() => onClearHighlight(verse)}
            style={{ width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center',
              borderWidth:1, borderColor:C.line }}>
            <Ionicons name="close" size={17} color={C.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ height:1, backgroundColor:C.hairline, marginVertical:18 }} />

      <View style={{ gap:9 }}>
        {actions.map(a => (
          <TouchableOpacity key={a.label} onPress={a.onPress}
            style={{
              flexDirection:'row', alignItems:'center', gap:13,
              paddingVertical:13, paddingHorizontal:15, borderRadius:14,
              backgroundColor: C.raised, borderWidth:1, borderColor: C.line,
            }}>
            <Ionicons name={a.icon} size={19} color={C[a.tone] || C.muted} />
            <Text style={{ fontFamily:F.bold, fontSize:14, color:C.text, flex:1 }}>{a.label}</Text>
            <Ionicons name="chevron-forward" size={15} color={C.dim} />
          </TouchableOpacity>
        ))}

        {sharedCount > 0 && (
          <TouchableOpacity onPress={onViewShared}
            style={{
              flexDirection:'row', alignItems:'center', gap:13,
              paddingVertical:13, paddingHorizontal:15, borderRadius:14,
              backgroundColor: C.tide + '12', borderWidth:1, borderColor: C.tide + '3A',
            }}>
            <Ionicons name="people-outline" size={19} color={C.tide} />
            <Text style={{ fontFamily:F.bold, fontSize:14, color:C.tide, flex:1 }}>
              {sharedCount} shared {sharedCount === 1 ? 'thought' : 'thoughts'}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={C.tide} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={async () => {
            await Clipboard.setStringAsync(`"${verse.text.trim()}" — ${ref}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
          }}
          style={{
            flexDirection:'row', alignItems:'center', gap:13,
            paddingVertical:13, paddingHorizontal:15, borderRadius:14,
            backgroundColor: C.raised, borderWidth:1, borderColor: C.line,
          }}>
          <Ionicons name="copy-outline" size={19} color={C.muted} />
          <Text style={{ fontFamily:F.bold, fontSize:14, color:C.text, flex:1 }}>Copy verse</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

// ─── COMPOSER: private note OR shared annotation ───────────────────
function ComposerSheet({ visible, mode, verse, book, chapter, user, existing, onClose, onSaved }) {
  const { C } = useSettings();
  const [text, setText]       = useState('');
  const [title, setTitle]     = useState('');
  const [vis, setVis]         = useState('friends');
  const [groupId, setGroupId] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [groups, setGroups]   = useState([]);

  const isNote = mode === 'note';

  useEffect(() => {
    if (!visible) return;
    setText(existing?.text || '');
    setTitle(existing?.title || '');
    setVis(isNote ? 'private' : (existing?.visibility || 'friends'));
    setGroupId(existing?.groupId || user?.groups?.[0] || null);
    if (!isNote && user?.groups?.length) {
      Promise.all(user.groups.map(g => getDoc(doc(db,'groups',g))))
        .then(s => setGroups(s.filter(x => x.exists()).map(x => ({ id:x.id, ...x.data() }))));
    }
  }, [visible, mode]);

  async function save() {
    if (!text.trim() || !user?.uid) return;
    setSaving(true);
    const key = verseKey(book, chapter, verse.verse);
    try {
      if (isNote) {
        await setDoc(doc(db,'notes',`${user.uid}_${key}`), {
          userId:user.uid, verseRef:key, book, chapter, verseNum:verse.verse,
          verseText:verse.text?.trim(), text:text.trim(),
          createdAt: existing?.createdAt || serverTimestamp(), updatedAt: serverTimestamp(),
        });
      } else {
        const id = existing?.id || `${user.uid}_${key}_${Date.now()}`;
        await setDoc(doc(db,'annotations',id), {
          id, userId:user.uid, userName:user.name, userAvatarId:user.avatarId,
          userRole:user.role || 'member',
          verseRef:key, book, chapter, verseNum:verse.verse, verseText:verse.text?.trim(),
          title:title.trim() || null, text:text.trim(),
          visibility: vis, groupId: vis === 'group' ? groupId : null,
          planId: vis === 'plan' ? (user.activePlanId || null) : null,
          reactions: existing?.reactions || {},
          pinned: existing?.pinned || false,
          edited: !!existing,
          createdAt: existing?.createdAt || serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onClose();
    } catch (e) { Alert.alert('Could not save', e.message); }
    setSaving(false);
  }

  async function remove() {
    if (!existing) return;
    try {
      await deleteDoc(doc(db, isNote ? 'notes' : 'annotations',
        isNote ? `${user.uid}_${verseKey(book,chapter,verse.verse)}` : existing.id));
      onSaved?.(); onClose();
    } catch (e) { Alert.alert('Could not delete', e.message); }
  }

  if (!verse) return null;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
          <Ionicons name={isNote ? 'lock-closed' : 'chatbubbles'} size={15} color={isNote ? C.muted : C.tide} />
          <Text style={{ fontFamily:F.heavy, fontSize:11, letterSpacing:1.4, textTransform:'uppercase',
            color: isNote ? C.muted : C.tide }}>
            {isNote ? 'Private note' : 'Shared thought'}
          </Text>
        </View>
        <Text style={{ fontFamily:F.display, fontSize:19, color:C.text }}>
          {book} {chapter}:{verse.verse}
        </Text>
        <Text style={{ fontFamily:F.scriptureItal, fontSize:13.5, color:C.muted, marginTop:6, lineHeight:21 }} numberOfLines={2}>
          {verse.text?.trim()}
        </Text>

        <View style={{ height:1, backgroundColor:C.hairline, marginVertical:16 }} />

        {!isNote && (
          <>
            <TextInput
              value={title} onChangeText={setTitle}
              placeholder="Title (optional)" placeholderTextColor={C.dim}
              style={[S(C).input, { marginBottom:10, fontFamily:F.bold }]}
              maxLength={60}
            />
          </>
        )}

        <TextInput
          value={text} onChangeText={setText}
          placeholder={isNote ? 'Write freely — only you will see this…' : 'What stood out to you here?'}
          placeholderTextColor={C.dim}
          style={[S(C).input, { minHeight:110, textAlignVertical:'top', lineHeight:21 }]}
          multiline autoFocus
        />

        {!isNote && (
          <View style={{ marginTop:18 }}>
            <Section tone="tide">Who can see this</Section>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
              {VISIBILITY.map(v => (
                <Chip key={v.id} label={v.label} icon={v.icon} tone={v.tone}
                  active={vis === v.id} onPress={() => setVis(v.id)} small />
              ))}
            </View>
            <Text style={[S(C).muted, { marginTop:9, fontSize:11.5 }]}>{visMeta(vis).blurb}</Text>

            {vis === 'group' && groups.length > 0 && (
              <View style={{ marginTop:14 }}>
                <Section>Which group</Section>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                  {groups.map(g => (
                    <Chip key={g.id} label={g.name} active={groupId === g.id}
                      onPress={() => setGroupId(g.id)} small />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ flexDirection:'row', gap:10, marginTop:22 }}>
          {existing && (
            <GhostButton label="Delete" tone="rose" onPress={remove} style={{ flex:1 }} />
          )}
          <GoldButton
            label={isNote ? 'Save note' : 'Share'}
            onPress={save} loading={saving}
            disabled={!text.trim()}
            style={{ flex: existing ? 2 : 1 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

// ─── SHARED THOUGHTS PANEL ─────────────────────────────────────────
function AnnotationCard({ a, user, onReact, onEdit, compact }) {
  const { C } = useSettings();
  const meta   = visMeta(a.visibility);
  const isMine = a.userId === user?.uid;
  const isLead = a.userRole === 'admin' || a.userRole === 'leader';
  const tone   = a.pinned ? C.amethyst : (C[meta.tone] || C.muted);

  return (
    <View style={{
      backgroundColor: a.pinned ? C.amethyst + '0E' : C.surface,
      borderRadius:16, padding:14, marginBottom:10,
      borderWidth:1, borderColor: a.pinned ? C.amethyst + '3A' : C.line,
      borderLeftWidth:3, borderLeftColor: tone,
    }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:9, marginBottom:9 }}>
        <Avatar user={a} size={30} />
        <View style={{ flex:1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Text style={{ fontFamily:F.heavy, fontSize:13, color:C.text }}>
              {isMine ? 'You' : a.userName}
            </Text>
            {isLead && (
              <View style={{ backgroundColor:C.amethyst + '22', borderRadius:5, paddingHorizontal:5, paddingVertical:1 }}>
                <Text style={{ fontSize:8, fontFamily:F.heavy, color:C.amethyst, letterSpacing:0.6 }}>LEADER</Text>
              </View>
            )}
            {a.pinned && <Ionicons name="bookmark" size={11} color={C.amethyst} />}
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:1 }}>
            <Ionicons name={meta.icon} size={9.5} color={C.dim} />
            <Text style={{ fontFamily:F.body, fontSize:11, color:C.dim }}>
              {meta.label} · {timeAgo(a.createdAt)}{a.edited ? ' · edited' : ''}
            </Text>
          </View>
        </View>
        {isMine && (
          <TouchableOpacity onPress={() => onEdit?.(a)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Ionicons name="ellipsis-horizontal" size={16} color={C.dim} />
          </TouchableOpacity>
        )}
      </View>

      {a.title ? (
        <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text, marginBottom:5 }}>{a.title}</Text>
      ) : null}
      <Text style={{ fontFamily:F.body, fontSize:14, color:C.text, lineHeight:22 }}>{a.text}</Text>

      {!compact && (
        <View style={{ flexDirection:'row', gap:7, marginTop:12 }}>
          {REACTIONS.map(r => {
            const list = a.reactions?.[r.id] || [];
            const mine = list.includes(user?.uid);
            return (
              <TouchableOpacity key={r.id} onPress={() => onReact?.(a, r.id)}
                style={{
                  flexDirection:'row', alignItems:'center', gap:5,
                  paddingVertical:5, paddingHorizontal:9, borderRadius:999,
                  borderWidth:1, borderColor: mine ? C.gold + '55' : C.line,
                  backgroundColor: mine ? C.gold + '12' : 'transparent',
                }}>
                <Text style={{ fontSize:12 }}>{r.emoji}</Text>
                {list.length > 0 && (
                  <Text style={{ fontFamily:F.bold, fontSize:11, color: mine ? C.gold : C.dim }}>
                    {list.length}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SharedPanel({ visible, verse, book, chapter, annotations, user, onClose, onReact, onEdit, onAdd }) {
  const { C } = useSettings();
  if (!verse) return null;
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={{ fontFamily:F.display, fontSize:19, color:C.text }}>
        {book} {chapter}:{verse.verse}
      </Text>
      <Text style={[S(C).muted, { marginTop:4, marginBottom:16 }]}>
        {annotations.length} shared {annotations.length === 1 ? 'thought' : 'thoughts'} · multiple faithful perspectives
      </Text>
      <ScrollView style={{ maxHeight:400 }} showsVerticalScrollIndicator={false}>
        {annotations.map(a => (
          <AnnotationCard key={a.id} a={a} user={user} onReact={onReact} onEdit={onEdit} />
        ))}
        <View style={{ height:8 }} />
      </ScrollView>
      <GoldButton label="Add your thought" icon="add" onPress={onAdd} style={{ marginTop:12 }} />
    </Sheet>
  );
}

// ─── BIBLE SCREEN ──────────────────────────────────────────────────
function BibleScreen({ user, onNav, todaysReading }) {
  const { C, fontSize, serifMode } = useSettings();

  const [book, setBook]           = useState('John');
  const [chapter, setChapter]     = useState('1');
  const [translation, setTrans]   = useState('nlt');
  const [verses, setVerses]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [booted, setBooted]       = useState(false);

  const [layer, setLayer]         = useState('personal');   // personal | shared
  const [highlights, setHL]       = useState({});
  const [notes, setNotes]         = useState({});
  const [annotations, setAnn]     = useState([]);

  const [showBooks, setShowBooks] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [sheet, setSheet]         = useState(null);         // verse | note | annotate | shared
  const [editing, setEditing]     = useState(null);
  const [showTrans, setShowTrans] = useState(false);

  const maxCh = CHAPTER_COUNTS[book] || 1;
  const chNum = parseInt(chapter) || 1;

  // Resume where they left off — the Bible should feel like home
  useEffect(() => {
    (async () => {
      const last = await getLastRead();
      if (last?.book) { setBook(last.book); setChapter(last.chapter); if (last.translation) setTrans(last.translation); }
      setBooted(true);
    })();
  }, []);

  useEffect(() => { if (booted) load(); }, [booted, book, chapter, translation]);

  async function load() {
    setLoading(true);
    const data = await fetchPassage(book, chapter, translation);
    if (data?.verses) {
      setVerses(data.verses);
      saveLastRead(book, chapter, translation);
    } else {
      setVerses([]);
      Alert.alert('Could not load passage', 'Check your connection and try again.');
    }
    setLoading(false);
  }

  // personal layer
  useEffect(() => {
    if (!user?.uid) return;
    const q1 = query(collection(db,'highlights'),
      where('userId','==',user.uid), where('book','==',book), where('chapter','==',chapter));
    const u1 = onSnapshot(q1, s => {
      const m = {}; s.docs.forEach(d => { const x = d.data(); m[x.verseNum] = x.color; }); setHL(m);
    }, () => {});
    const q2 = query(collection(db,'notes'),
      where('userId','==',user.uid), where('book','==',book), where('chapter','==',chapter));
    const u2 = onSnapshot(q2, s => {
      const m = {}; s.docs.forEach(d => { const x = d.data(); m[x.verseNum] = { id:d.id, ...x }; }); setNotes(m);
    }, () => {});
    return () => { u1(); u2(); };
  }, [user?.uid, book, chapter]);

  // shared layer — only what this user is permitted to see
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db,'annotations'), where('book','==',book), where('chapter','==',chapter));
    const unsub = onSnapshot(q, s => {
      const friends = user.friends || [];
      const groups  = user.groups  || [];
      const visible = s.docs.map(d => ({ id:d.id, ...d.data() })).filter(a => {
        if (a.userId === user.uid) return true;
        if (a.visibility === 'public')  return true;
        if (a.visibility === 'friends') return friends.includes(a.userId);
        if (a.visibility === 'group')   return groups.includes(a.groupId);
        if (a.visibility === 'plan')    return !!a.planId && a.planId === user.activePlanId;
        return false;
      });
      // ordering per the manual: mine → pinned → friends → group → public
      const rank = a => {
        if (a.userId === user.uid) return 0;
        if (a.pinned) return 1;
        if (a.visibility === 'friends') return 2;
        if (a.visibility === 'group')   return 3;
        if (a.visibility === 'plan')    return 4;
        return 5;
      };
      visible.sort((x,y) => rank(x) - rank(y));
      setAnn(visible);
    }, () => {});
    return unsub;
  }, [user?.uid, user?.friends, user?.groups, book, chapter]);

  const byVerse = useMemo(() => {
    const m = {};
    annotations.forEach(a => { (m[a.verseNum] ||= []).push(a); });
    return m;
  }, [annotations]);

  function go(ch) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChapter(String(ch));
  }

  async function saveHighlight(v, color) {
    if (!user?.uid) return;
    const k = verseKey(book, chapter, v.verse);
    try {
      await setDoc(doc(db,'highlights',`${user.uid}_${k}`), {
        userId:user.uid, book, chapter, verseNum:v.verse,
        verseText:v.text?.trim(), color, createdAt: serverTimestamp(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setSheet(null);
  }
  async function clearHighlight(v) {
    if (!user?.uid) return;
    try { await deleteDoc(doc(db,'highlights',`${user.uid}_${verseKey(book,chapter,v.verse)}`)); } catch {}
    setSheet(null);
  }

  async function react(a, rid) {
    if (!user?.uid) return;
    const list = a.reactions?.[rid] || [];
    const has  = list.includes(user.uid);
    try {
      await updateDoc(doc(db,'annotations',a.id), {
        [`reactions.${rid}`]: has ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
      Haptics.selectionAsync();
    } catch {}
  }

  const shared = layer === 'shared';

  return (
    <SafeAreaView style={S(C).safe} edges={['top']}>
      {/* ── header ── */}
      <View style={{ paddingHorizontal:20, paddingTop:6, paddingBottom:12,
        borderBottomWidth:1, borderBottomColor:C.hairline }}>

        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <TouchableOpacity onPress={() => setShowBooks(true)} activeOpacity={0.8}
            style={{ flexDirection:'row', alignItems:'center', gap:8, flex:1 }}>
            <View>
              <Text style={{ fontFamily:F.bold, fontSize:10.5, letterSpacing:1.6,
                color:C.muted, textTransform:'uppercase' }}>{book}</Text>
              <View style={{ flexDirection:'row', alignItems:'baseline', gap:7 }}>
                <Text style={{ fontFamily:F.display, fontSize:34, color:C.text, lineHeight:41 }}>{chapter}</Text>
                <Ionicons name="chevron-down" size={15} color={C.gold} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowTrans(!showTrans)}
            style={{ paddingVertical:7, paddingHorizontal:13, borderRadius:11,
              borderWidth:1, borderColor:C.line, backgroundColor:C.raised }}>
            <Text style={{ fontFamily:F.heavy, fontSize:11.5, color:C.gold, letterSpacing:0.5 }}>
              {TRANSLATION_LABELS[translation]}
            </Text>
          </TouchableOpacity>
        </View>

        {showTrans && (
          <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
            {TRANSLATIONS.map(t => (
              <Chip key={t} label={TRANSLATION_LABELS[t]} active={translation === t} small
                onPress={() => { setTrans(t); setShowTrans(false); }} />
            ))}
          </View>
        )}

        {/* Personal / Shared — the signature mechanic.
            Scripture never changes; only the layer over it does. */}
        <View style={{ flexDirection:'row', backgroundColor:C.raised, borderRadius:12,
          padding:3, marginTop:14, borderWidth:1, borderColor:C.line }}>
          {[
            { id:'personal', label:'Personal', icon:'book-outline',   tone:C.gold },
            { id:'shared',   label:'Shared',   icon:'people-outline', tone:C.tide },
          ].map(t => {
            const on = layer === t.id;
            return (
              <TouchableOpacity key={t.id}
                onPress={() => { Haptics.selectionAsync(); setLayer(t.id); }}
                style={{
                  flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6,
                  paddingVertical:8, borderRadius:10,
                  backgroundColor: on ? t.tone + '1C' : 'transparent',
                  borderWidth:1, borderColor: on ? t.tone + '4D' : 'transparent',
                }}>
                <Ionicons name={t.icon} size={14} color={on ? t.tone : C.dim} />
                <Text style={{ fontFamily:F.bold, fontSize:12.5, color: on ? t.tone : C.dim }}>{t.label}</Text>
                {t.id === 'shared' && annotations.length > 0 && (
                  <View style={{ backgroundColor: on ? C.tide : C.dim, borderRadius:9,
                    minWidth:17, paddingHorizontal:5, paddingVertical:1 }}>
                    <Text style={{ fontSize:9.5, fontFamily:F.heavy, color:C.abyss, textAlign:'center' }}>
                      {annotations.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── scripture ── */}
      {loading ? <ScriptureSkeleton /> : (
        <ScrollView
          style={{ flex:1 }}
          contentContainerStyle={{ paddingHorizontal:22, paddingTop:20, paddingBottom:130 }}
          showsVerticalScrollIndicator={false}
        >
          {todaysReading && (
            <TouchableOpacity onPress={() => onNav('plans')}
              style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:18,
                padding:13, borderRadius:14, backgroundColor:C.gold + '10',
                borderWidth:1, borderColor:C.gold + '30' }}>
              <Ionicons name="bookmark-outline" size={17} color={C.gold} />
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:F.heavy, fontSize:11, letterSpacing:1.2,
                  color:C.gold, textTransform:'uppercase' }}>Today's reading</Text>
                <Text style={{ fontFamily:F.bold, fontSize:13.5, color:C.text, marginTop:2 }}>
                  {todaysReading.passage}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={C.gold} />
            </TouchableOpacity>
          )}

          {verses.map(v => {
            const hl    = highlights[v.verse];
            const note  = notes[v.verse];
            const anns  = byVerse[v.verse] || [];
            const count = anns.length;

            return (
              <View key={v.verse}>
                <Pressable
                  onPress={() => { setSelected(v); setSheet('verse'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  onLongPress={() => { setSelected(v); setSheet('verse'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  style={({ pressed }) => ({
                    flexDirection:'row', gap:11, paddingVertical:6, paddingHorizontal:9,
                    borderRadius:11, marginBottom:2,
                    borderLeftWidth: hl ? 3 : 0, borderLeftColor: hl || 'transparent',
                    backgroundColor: hl ? hl + '1A' : (pressed ? C.raised : 'transparent'),
                  })}>
                  <View style={{ alignItems:'center', width:20, paddingTop:5, gap:3 }}>
                    <Text style={{ fontFamily:F.heavy, fontSize:10,
                      color: hl || C.dim }}>{v.verse}</Text>
                    {note && <View style={{ width:4, height:4, borderRadius:2, backgroundColor:C.muted }} />}
                    {shared && count > 0 && (
                      <View style={{ width:5, height:5, borderRadius:3, backgroundColor:C.tide }} />
                    )}
                  </View>
                  <Text style={{
                    flex:1,
                    fontFamily: serifMode ? F.scripture : F.body,
                    fontSize: fontSize,
                    lineHeight: fontSize * 1.75,
                    color: C.parchment,
                  }}>
                    {v.text.trim()}
                  </Text>
                </Pressable>

                {/* Personal layer: your own note inline */}
                {!shared && note && (
                  <TouchableOpacity
                    onPress={() => { setSelected(v); setEditing(note); setSheet('note'); }}
                    style={{ marginLeft:40, marginTop:2, marginBottom:8, padding:11, borderRadius:12,
                      backgroundColor:C.raised, borderLeftWidth:2, borderLeftColor:C.muted }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginBottom:4 }}>
                      <Ionicons name="lock-closed" size={9} color={C.dim} />
                      <Text style={{ fontFamily:F.heavy, fontSize:9, letterSpacing:1,
                        color:C.dim, textTransform:'uppercase' }}>Your note</Text>
                    </View>
                    <Text style={{ fontFamily:F.body, fontSize:13, color:C.text, lineHeight:20 }}>{note.text}</Text>
                  </TouchableOpacity>
                )}

                {/* Shared layer: community thoughts inline */}
                {shared && count > 0 && (
                  <View style={{ marginLeft:40, marginTop:4, marginBottom:10 }}>
                    {anns.slice(0, 2).map(a => (
                      <AnnotationCard key={a.id} a={a} user={user} onReact={react}
                        onEdit={x => { setSelected(v); setEditing(x); setSheet('annotate'); }} />
                    ))}
                    {count > 2 && (
                      <TouchableOpacity onPress={() => { setSelected(v); setSheet('shared'); }}
                        style={{ paddingVertical:8 }}>
                        <Text style={{ fontFamily:F.bold, fontSize:12.5, color:C.tide }}>
                          View all {count} thoughts →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {!verses.length && !loading && (
            <Empty icon="📖" title="Nothing loaded"
              body="Pick a book and chapter to begin reading." />
          )}

          {/* chapter nav */}
          {verses.length > 0 && (
            <View style={{ flexDirection:'row', gap:11, marginTop:34 }}>
              <TouchableOpacity disabled={chNum <= 1} onPress={() => go(chNum - 1)}
                style={[S(C).chNav, { opacity: chNum <= 1 ? 0.3 : 1 }]}>
                <Ionicons name="chevron-back" size={15} color={C.gold} />
                <Text style={{ fontFamily:F.bold, fontSize:12.5, color:C.gold }}>
                  {chNum > 1 ? `${book} ${chNum - 1}` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={chNum >= maxCh} onPress={() => go(chNum + 1)}
                style={[S(C).chNav, { justifyContent:'flex-end', opacity: chNum >= maxCh ? 0.3 : 1 }]}>
                <Text style={{ fontFamily:F.bold, fontSize:12.5, color:C.gold }}>
                  {chNum < maxCh ? `${book} ${chNum + 1}` : ''}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={C.gold} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={{ textAlign:'center', marginTop:22, fontFamily:F.body,
            fontSize:11.5, color:C.dim }}>
            Tap any verse to highlight, note, or share
          </Text>
        </ScrollView>
      )}

      <BookPicker visible={showBooks} current={book} onClose={() => setShowBooks(false)}
        onPick={(b, c) => { setBook(b); setChapter(c); }} />

      <VerseSheet
        visible={sheet === 'verse'} verse={selected} book={book} chapter={chapter} user={user}
        highlight={selected ? highlights[selected.verse] : null}
        sharedCount={selected ? (byVerse[selected.verse] || []).length : 0}
        onClose={() => setSheet(null)}
        onHighlight={saveHighlight} onClearHighlight={clearHighlight}
        onNote={()     => { setEditing(notes[selected?.verse] || null); setSheet('note'); }}
        onAnnotate={() => { setEditing(null); setSheet('annotate'); }}
        onViewShared={() => setSheet('shared')}
        onPray={() => { setSheet(null); onNav('prayer', { verse: selected, book, chapter }); }}
      />

      <ComposerSheet
        visible={sheet === 'note' || sheet === 'annotate'}
        mode={sheet === 'note' ? 'note' : 'annotation'}
        verse={selected} book={book} chapter={chapter} user={user} existing={editing}
        onClose={() => { setSheet(null); setEditing(null); }}
      />

      <SharedPanel
        visible={sheet === 'shared'} verse={selected} book={book} chapter={chapter}
        annotations={selected ? (byVerse[selected.verse] || []) : []}
        user={user} onReact={react}
        onEdit={a => { setEditing(a); setSheet('annotate'); }}
        onAdd={() => { setEditing(null); setSheet('annotate'); }}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  READING PLANS  —  the path. Scripture is the destination.
// ═══════════════════════════════════════════════════════════════════

const CADENCES = [
  { id:'daily',   label:'Every day',   days:[0,1,2,3,4,5,6], blurb:'7 days a week' },
  { id:'weekday', label:'Weekdays',    days:[1,2,3,4,5],     blurb:'Mon – Fri'     },
  { id:'thrice',  label:'3× a week',   days:[1,3,5],         blurb:'Mon, Wed, Fri' },
  { id:'weekend', label:'Weekends',    days:[0,6],           blurb:'Sat & Sun'     },
  { id:'custom',  label:'Custom',      days:[],              blurb:'Pick your days'},
];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_LONG  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function buildDays(startDate, weeks, activeDays) {
  const start = new Date(startDate + 'T00:00:00');
  const out = [];
  let n = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const dow  = d.getDay();
    const date = d.toISOString().split('T')[0];
    const rest = activeDays.length > 0 && !activeDays.includes(dow);
    if (!rest) n++;
    out.push({
      id:`d-${date}`, date, dow, rest,
      day: rest ? null : n,
      passage:'', reflection:'', prompts:[], restLabel:'',
    });
  }
  return out;
}

// Auto-fill: pick a book, we spread its chapters across the reading days
function autoFill(days, bookName, startCh = 1) {
  let ch = startCh;
  const max = CHAPTER_COUNTS[bookName] || 1;
  return days.map(d => {
    if (d.rest || d.passage) return d;
    if (ch > max) return d;
    return { ...d, passage: `${bookName} ${ch++}` };
  });
}

function PlansScreen({ user, onNav, plans, loading, onRefresh }) {
  const { C } = useSettings();
  const canCreate = true; // anyone can start a plan — even for themselves

  const active = plans.filter(p => p.status === 'published');
  const drafts = plans.filter(p => p.status === 'draft');

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={loading}>
      <Header title="Reading Plans"
        sub="A guided path through Scripture — alone or together."
        right={
          <TouchableOpacity onPress={() => onNav('planBuilder')}
            style={{ flexDirection:'row', alignItems:'center', gap:5,
              paddingVertical:8, paddingHorizontal:13, borderRadius:11,
              backgroundColor:C.gold + '14', borderWidth:1, borderColor:C.gold + '3D' }}>
            <Ionicons name="add" size={15} color={C.gold} />
            <Text style={{ fontFamily:F.bold, fontSize:12.5, color:C.gold }}>New</Text>
          </TouchableOpacity>
        }
      />

      {!plans.length ? (
        <Empty icon="📚" title="No reading plans yet"
          body="Create one in under a minute. Pick a book, pick your days, invite whoever you want."
          action={<GoldButton label="Create a plan" icon="add" onPress={() => onNav('planBuilder')} />}
        />
      ) : (
        <>
          {active.length > 0 && <Section tone="gold">Active</Section>}
          {active.map(p => <PlanCard key={p.id} plan={p} user={user} onNav={onNav} />)}

          {drafts.length > 0 && (
            <>
              <View style={{ height:14 }} />
              <Section>Drafts</Section>
              {drafts.map(p => <PlanCard key={p.id} plan={p} user={user} onNav={onNav} draft />)}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function PlanCard({ plan, user, onNav, draft }) {
  const { C } = useSettings();
  const days  = plan.days || [];
  const read  = days.filter(d => !d.rest);
  const done  = read.filter(d => (d.completedBy || []).includes(user?.uid)).length;
  const pct   = read.length ? done / read.length : 0;
  const today = days.find(d => d.date === todayStr());

  return (
    <Card onPress={() => onNav('planDetail', { plan })} style={{ marginBottom:11 }}>
      <View style={{ flexDirection:'row', alignItems:'flex-start', gap:12 }}>
        <View style={{ width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center',
          backgroundColor: draft ? C.raised : C.gold + '18',
          borderWidth:1, borderColor: draft ? C.line : C.gold + '3D' }}>
          <Ionicons name="book" size={19} color={draft ? C.dim : C.gold} />
        </View>
        <View style={{ flex:1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:7 }}>
            <Text style={{ fontFamily:F.heavy, fontSize:15, color:C.text, flex:1 }}>{plan.title}</Text>
            {draft && (
              <View style={{ backgroundColor:C.raised, borderRadius:6, paddingHorizontal:7, paddingVertical:2 }}>
                <Text style={{ fontSize:9, fontFamily:F.heavy, color:C.muted, letterSpacing:0.7 }}>DRAFT</Text>
              </View>
            )}
          </View>
          {plan.description ? (
            <Text style={[S(C).muted, { marginTop:3 }]} numberOfLines={1}>{plan.description}</Text>
          ) : null}

          {today && !today.rest && today.passage && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:8 }}>
              <View style={{ width:5, height:5, borderRadius:3, backgroundColor:C.gold }} />
              <Text style={{ fontFamily:F.bold, fontSize:12.5, color:C.gold }}>
                Today · {today.passage}
              </Text>
            </View>
          )}

          <View style={{ marginTop:11 }}>
            <View style={{ height:4, backgroundColor:C.raised, borderRadius:99, overflow:'hidden' }}>
              <View style={{ width:`${pct * 100}%`, height:4, backgroundColor:C.gold, borderRadius:99 }} />
            </View>
            <Text style={[S(C).muted, { marginTop:6, fontSize:11.5 }]}>
              {done} of {read.length} readings · {plan.memberCount || 1} {(plan.memberCount || 1) === 1 ? 'person' : 'people'}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ─── PLAN DETAIL ───────────────────────────────────────────────────
function PlanDetailScreen({ plan: initial, user, onBack, onNav, onChanged }) {
  const { C } = useSettings();
  const [plan, setPlan] = useState(initial);
  const [week, setWeek] = useState(1);

  const days   = plan.days || [];
  const weeks  = Math.ceil(days.length / 7) || 1;
  const isLead = plan.ownerUid === user?.uid || (plan.admins || []).includes(user?.uid);
  const slice  = days.slice((week - 1) * 7, week * 7);

  async function toggleDone(d) {
    const has = (d.completedBy || []).includes(user.uid);
    const next = days.map(x => x.id !== d.id ? x : {
      ...x, completedBy: has
        ? (x.completedBy || []).filter(u => u !== user.uid)
        : [...(x.completedBy || []), user.uid],
    });
    setPlan(p => ({ ...p, days: next }));
    try {
      await updateDoc(doc(db,'readingPlans',plan.id), { days: next });
      if (!has) await logHabit(user.uid, 'reading');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChanged?.({ ...plan, days: next });
    } catch {}
  }

  return (
    <Screen scroll>
      <Header title={plan.title} sub={plan.description} onBack={onBack}
        right={isLead ? (
          <TouchableOpacity onPress={() => onNav('planBuilder', { plan })}
            style={{ padding:8 }}>
            <Ionicons name="create-outline" size={20} color={C.gold} />
          </TouchableOpacity>
        ) : null}
      />

      <View style={{ flexDirection:'row', gap:9, marginBottom:18 }}>
        <GhostButton label="Invite" icon="qr-code-outline" style={{ flex:1 }}
          onPress={() => onNav('planInvite', { plan })} />
        {plan.groupId ? (
          <GhostButton label="Group" icon="people-outline" tone="tide" style={{ flex:1 }}
            onPress={() => onNav('groups')} />
        ) : null}
      </View>

      {weeks > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap:8, paddingBottom:14 }}>
          {Array.from({ length: weeks }, (_, i) => i + 1).map(w => (
            <Chip key={w} label={`Week ${w}`} active={week === w} onPress={() => setWeek(w)} small />
          ))}
        </ScrollView>
      )}

      {slice.map(d => {
        const done = (d.completedBy || []).includes(user?.uid);
        const isToday = d.date === todayStr();
        if (d.rest) return (
          <View key={d.id} style={[S(C).card, { flexDirection:'row', alignItems:'center', gap:12,
            marginBottom:9, backgroundColor:C.amethyst + '0A', borderColor:C.amethyst + '28' }]}>
            <View style={{ width:32, height:32, borderRadius:11, alignItems:'center', justifyContent:'center',
              backgroundColor:C.amethyst + '1C' }}>
              <Text style={{ fontSize:14 }}>🕊️</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontFamily:F.bold, fontSize:13.5, color:C.amethyst }}>
                {d.restLabel || 'Rest & reflect'}
              </Text>
              <Text style={[S(C).muted, { fontSize:11.5, marginTop:2 }]}>{fmtDate(d.date)}</Text>
            </View>
          </View>
        );

        return (
          <View key={d.id} style={[S(C).card, {
            flexDirection:'row', alignItems:'center', gap:12, marginBottom:9,
            borderColor: isToday ? C.gold + '4D' : C.line,
            backgroundColor: isToday ? C.gold + '0A' : C.surface,
          }]}>
            <TouchableOpacity onPress={() => toggleDone(d)}
              style={{ width:32, height:32, borderRadius:11, alignItems:'center', justifyContent:'center',
                backgroundColor: done ? C.sage : (isToday ? C.gold : C.raised),
                borderWidth: done || isToday ? 0 : 1, borderColor:C.line }}>
              {done
                ? <Ionicons name="checkmark" size={17} color={C.abyss} />
                : <Text style={{ fontFamily:F.heavy, fontSize:12,
                    color: isToday ? C.abyss : C.muted }}>{d.day}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={{ flex:1 }} activeOpacity={0.8}
              onPress={() => {
                const p = parseRef(d.passage);
                if (p) { saveLastRead(p.book, p.chapter, 'nlt'); onNav('bible'); }
              }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                <Text style={{ fontFamily:F.heavy, fontSize:14,
                  color: done ? C.muted : C.text,
                  textDecorationLine: done ? 'line-through' : 'none' }}>
                  {d.passage || `Day ${d.day}`}
                </Text>
                {isToday && (
                  <View style={{ backgroundColor:C.gold, borderRadius:6, paddingHorizontal:6, paddingVertical:1.5 }}>
                    <Text style={{ fontSize:8.5, fontFamily:F.heavy, color:C.abyss, letterSpacing:0.7 }}>TODAY</Text>
                  </View>
                )}
              </View>
              <Text style={[S(C).muted, { fontSize:11.5, marginTop:2 }]}>{fmtDate(d.date)}</Text>
              {d.reflection ? (
                <Text style={{ fontFamily:F.scriptureItal, fontSize:12.5, color:C.muted, marginTop:5, lineHeight:19 }}
                  numberOfLines={2}>{d.reflection}</Text>
              ) : null}
            </TouchableOpacity>

            <Ionicons name="chevron-forward" size={16} color={C.dim} />
          </View>
        );
      })}
    </Screen>
  );
}

// ─── PLAN BUILDER  —  under a minute, start to finish ──────────────
function PlanBuilderScreen({ plan: editing, user, groups, onBack, onDone }) {
  const { C } = useSettings();
  const [step, setStep]     = useState(1);
  const [title, setTitle]   = useState(editing?.title || '');
  const [desc, setDesc]     = useState(editing?.description || '');
  const [bookSel, setBook]  = useState('John');
  const [weeks, setWeeks]   = useState(editing?.weeks || 4);
  const [start, setStart]   = useState(editing?.startDate || todayStr());
  const [cadence, setCad]   = useState(editing?.cadence || 'daily');
  const [customDays, setCD] = useState([1,3,5]);
  const [days, setDays]     = useState(editing?.days || []);
  const [audience, setAud]  = useState(editing?.groupId ? 'group' : 'personal');
  const [groupId, setGid]   = useState(editing?.groupId || groups?.[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [editDay, setEditDay] = useState(null);

  const activeDays = cadence === 'custom' ? customDays : CADENCES.find(c => c.id === cadence).days;
  const readCount  = days.filter(d => !d.rest).length;

  function generate() {
    const built = buildDays(start, weeks, activeDays);
    setDays(autoFill(built, bookSel, 1));
    setStep(3);
  }

  async function save(status) {
    if (!title.trim()) { Alert.alert('Give it a title', 'Even something simple like "John in 30 days".'); return; }
    setSaving(true);
    const payload = {
      title: title.trim(), description: desc.trim() || null,
      ownerUid: user.uid, admins: editing?.admins || [],
      members: editing?.members || [user.uid],
      memberCount: (editing?.members || [user.uid]).length,
      groupId: audience === 'group' ? groupId : null,
      weeks, startDate: start, cadence, activeDays, days, status,
      updatedAt: serverTimestamp(),
    };
    try {
      if (editing?.id) {
        await updateDoc(doc(db,'readingPlans',editing.id), payload);
        onDone({ id: editing.id, ...payload });
      } else {
        const ref = await addDoc(collection(db,'readingPlans'), { ...payload, createdAt: serverTimestamp() });
        await updateDoc(doc(db,'users',user.uid), { activePlanId: ref.id, plans: arrayUnion(ref.id) });
        onDone({ id: ref.id, ...payload });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { Alert.alert('Could not save', e.message); setSaving(false); }
  }

  // ── step 1: what are we reading ──
  if (step === 1) return (
    <Screen scroll>
      <Header title="What are we reading?" onBack={onBack}
        sub="Pick a book. You can fine-tune every day later." />

      <Text style={S(C).label}>Plan title</Text>
      <TextInput value={title} onChangeText={setTitle} style={S(C).input}
        placeholder="e.g. John in 30 Days" placeholderTextColor={C.dim} />

      <Text style={[S(C).label, { marginTop:18 }]}>Description (optional)</Text>
      <TextInput value={desc} onChangeText={setDesc} style={S(C).input}
        placeholder="A short line about this journey" placeholderTextColor={C.dim} />

      <Text style={[S(C).label, { marginTop:18 }]}>Book</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingVertical:3 }}>
        {BOOKS.map(b => <Chip key={b} label={b} active={bookSel === b} onPress={() => setBook(b)} small />)}
      </ScrollView>
      <Text style={[S(C).muted, { marginTop:8 }]}>
        {bookSel} has {CHAPTER_COUNTS[bookSel]} chapters
      </Text>

      <GoldButton label="Next" onPress={() => title.trim() ? setStep(2) : Alert.alert('Give it a title first')}
        style={{ marginTop:28 }} disabled={!title.trim()} />
    </Screen>
  );

  // ── step 2: rhythm ──
  if (step === 2) return (
    <Screen scroll>
      <Header title="Set the rhythm" onBack={() => setStep(1)}
        sub="Consistency beats intensity. Pick something you'll actually keep." />

      <Text style={S(C).label}>Start date</Text>
      <TextInput value={start} onChangeText={setStart} style={S(C).input}
        placeholder="YYYY-MM-DD" placeholderTextColor={C.dim} />

      <Text style={[S(C).label, { marginTop:18 }]}>How many weeks</Text>
      <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
        {[1,2,3,4,6,8,12].map(w => (
          <Chip key={w} label={`${w} wk`} active={weeks === w} onPress={() => setWeeks(w)} small />
        ))}
      </View>

      <Text style={[S(C).label, { marginTop:20 }]}>Which days</Text>
      <View style={{ gap:9 }}>
        {CADENCES.map(c => {
          const on = cadence === c.id;
          return (
            <TouchableOpacity key={c.id} onPress={() => { Haptics.selectionAsync(); setCad(c.id); }}
              style={{ flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:14,
                backgroundColor: on ? C.gold + '0E' : C.surface,
                borderWidth:1.5, borderColor: on ? C.gold + '55' : C.line }}>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:F.heavy, fontSize:13.5, color: on ? C.gold : C.text }}>{c.label}</Text>
                <Text style={[S(C).muted, { fontSize:11.5, marginTop:2 }]}>{c.blurb}</Text>
              </View>
              <View style={{ width:19, height:19, borderRadius:10, borderWidth:2,
                borderColor: on ? C.gold : C.dim, alignItems:'center', justifyContent:'center' }}>
                {on && <View style={{ width:9, height:9, borderRadius:5, backgroundColor:C.gold }} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {cadence === 'custom' && (
        <View style={{ marginTop:14 }}>
          <View style={{ flexDirection:'row', gap:6 }}>
            {DAY_SHORT.map((d, i) => {
              const on = customDays.includes(i);
              return (
                <TouchableOpacity key={i}
                  onPress={() => setCD(p => on ? p.filter(x => x !== i) : [...p, i].sort())}
                  style={{ flex:1, paddingVertical:11, borderRadius:11, alignItems:'center',
                    backgroundColor: on ? C.gold : C.raised,
                    borderWidth:1, borderColor: on ? C.gold : C.line }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:11,
                    color: on ? C.abyss : C.muted }}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {groups?.length > 0 && (
        <View style={{ marginTop:22 }}>
          <Text style={S(C).label}>Who is this for</Text>
          <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
            <Chip label="Just me / friends" active={audience === 'personal'} onPress={() => setAud('personal')} small />
            <Chip label="A group" tone="tide" active={audience === 'group'} onPress={() => setAud('group')} small />
          </View>
          {audience === 'group' && (
            <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap', marginTop:10 }}>
              {groups.map(g => (
                <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGid(g.id)} small />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={[S(C).notice, { marginTop:22 }]}>
        <Text style={{ fontFamily:F.body, fontSize:12.5, color:C.gold, lineHeight:19 }}>
          {weeks} weeks · about {weeks * activeDays.length} readings ·
          reading on {activeDays.map(d => DAY_SHORT[d]).join(', ')}
        </Text>
      </View>

      <GoldButton label="Build the plan" icon="sparkles-outline" onPress={generate} style={{ marginTop:20 }} />
    </Screen>
  );

  // ── step 3: review ──
  if (editDay !== null) {
    const d = days[editDay];
    return (
      <DayEditor day={d} onBack={() => setEditDay(null)}
        onSave={updated => {
          const next = [...days]; next[editDay] = updated; setDays(next); setEditDay(null);
        }} />
    );
  }

  return (
    <SafeAreaView style={S(C).safe} edges={['top']}>
      <View style={{ paddingHorizontal:22, paddingTop:12, paddingBottom:14,
        borderBottomWidth:1, borderBottomColor:C.hairline }}>
        <TouchableOpacity onPress={() => setStep(2)}
          style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:8 }}>
          <Ionicons name="chevron-back" size={16} color={C.gold} />
          <Text style={{ color:C.gold, fontFamily:F.bold, fontSize:13.5 }}>Rhythm</Text>
        </TouchableOpacity>
        <Text style={S(C).h1}>{title}</Text>
        <Text style={[S(C).muted, { marginTop:6 }]}>
          {readCount} readings · {days.length - readCount} rest days · tap any day to edit
        </Text>
        <View style={{ flexDirection:'row', gap:9, marginTop:14 }}>
          <GhostButton label="Save draft" style={{ flex:1 }} onPress={() => save('draft')} />
          <GoldButton label="Publish" style={{ flex:1.4 }} loading={saving} onPress={() => save('published')} />
        </View>
      </View>

      <FlatList
        data={days} keyExtractor={d => d.id}
        contentContainerStyle={{ padding:18, paddingBottom:120 }}
        renderItem={({ item: d, index }) => {
          const wk = Math.floor(index / 7) + 1;
          const head = index % 7 === 0;
          return (
            <View>
              {head && (
                <Text style={{ fontFamily:F.heavy, fontSize:10, letterSpacing:1.8, color:C.dim,
                  textTransform:'uppercase', marginTop: index === 0 ? 0 : 16, marginBottom:8 }}>
                  Week {wk}
                </Text>
              )}
              <TouchableOpacity onPress={() => setEditDay(index)}
                style={[S(C).card, { flexDirection:'row', alignItems:'center', gap:12, marginBottom:8,
                  backgroundColor: d.rest ? C.amethyst + '0A' : C.surface,
                  borderColor: d.rest ? C.amethyst + '26' : (d.passage ? C.gold + '30' : C.line) }]}>
                <View style={{ width:30, height:30, borderRadius:10, alignItems:'center', justifyContent:'center',
                  backgroundColor: d.rest ? C.amethyst + '1C' : (d.passage ? C.gold + '1C' : C.raised) }}>
                  {d.rest ? <Text style={{ fontSize:12 }}>🕊️</Text>
                    : <Text style={{ fontFamily:F.heavy, fontSize:11, color: d.passage ? C.gold : C.dim }}>{d.day}</Text>}
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontFamily:F.bold, fontSize:13.5,
                    color: d.rest ? C.amethyst : (d.passage ? C.text : C.dim) }}>
                    {d.rest ? (d.restLabel || 'Rest day') : (d.passage || 'Tap to add a passage')}
                  </Text>
                  <Text style={[S(C).muted, { fontSize:11, marginTop:2 }]}>
                    {fmtDate(d.date)}{d.prompts?.length ? ` · ${d.prompts.length} prompts` : ''}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={15} color={C.dim} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function DayEditor({ day, onSave, onBack }) {
  const { C } = useSettings();
  const [passage, setPassage] = useState(day.passage || '');
  const [reflection, setRef]  = useState(day.reflection || '');
  const [prompts, setPrompts] = useState(day.prompts || []);
  const [np, setNp]           = useState('');
  const [restLabel, setRL]    = useState(day.restLabel || '');

  if (day.rest) return (
    <Screen scroll>
      <Header title="Rest day" onBack={onBack} sub={`${fmtDate(day.date)} · ${DAY_LONG[day.dow]}`} />
      <View style={[S(C).notice, { backgroundColor:C.amethyst + '10', borderColor:C.amethyst + '30', marginBottom:20 }]}>
        <Text style={{ fontFamily:F.body, fontSize:12.5, color:C.amethyst, lineHeight:19 }}>
          Rest days aren't empty days. Give this one a name if you want — Sabbath, Reflect, Catch up.
        </Text>
      </View>
      <Text style={S(C).label}>Label</Text>
      <TextInput value={restLabel} onChangeText={setRL} style={S(C).input}
        placeholder="Rest & reflect" placeholderTextColor={C.dim} />
      <GoldButton label="Save" onPress={() => onSave({ ...day, restLabel })} style={{ marginTop:24 }} />
    </Screen>
  );

  return (
    <Screen scroll>
      <Header title={`Day ${day.day}`} onBack={onBack} sub={`${fmtDate(day.date)} · ${DAY_LONG[day.dow]}`} />

      <Text style={S(C).label}>Passage</Text>
      <TextInput value={passage} onChangeText={setPassage} style={S(C).input}
        placeholder="e.g. John 3" placeholderTextColor={C.dim} />

      <Text style={[S(C).label, { marginTop:18 }]}>Leader reflection (optional)</Text>
      <Text style={[S(C).muted, { marginBottom:8, fontSize:11.5 }]}>
        This appears pinned on the passage — not as a separate devotional page.
      </Text>
      <TextInput value={reflection} onChangeText={setRef} multiline
        style={[S(C).input, { minHeight:82, textAlignVertical:'top' }]}
        placeholder="A short thought to guide the reading" placeholderTextColor={C.dim} />

      <Text style={[S(C).label, { marginTop:18 }]}>Discussion prompts</Text>
      {prompts.map((p, i) => (
        <View key={i} style={{ flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:8 }}>
          <View style={{ width:21, height:21, borderRadius:7, backgroundColor:C.gold + '1C',
            alignItems:'center', justifyContent:'center', marginTop:1 }}>
            <Text style={{ fontFamily:F.heavy, fontSize:10, color:C.gold }}>{i + 1}</Text>
          </View>
          <Text style={{ flex:1, fontFamily:F.body, fontSize:13.5, color:C.text, lineHeight:20 }}>{p}</Text>
          <TouchableOpacity onPress={() => setPrompts(x => x.filter((_, j) => j !== i))}>
            <Ionicons name="close" size={16} color={C.rose} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ flexDirection:'row', gap:9, marginTop:6 }}>
        <TextInput value={np} onChangeText={setNp} style={[S(C).input, { flex:1 }]}
          placeholder="Add a question…" placeholderTextColor={C.dim}
          onSubmitEditing={() => { if (np.trim()) { setPrompts(p => [...p, np.trim()]); setNp(''); } }} />
        <TouchableOpacity onPress={() => { if (np.trim()) { setPrompts(p => [...p, np.trim()]); setNp(''); } }}
          style={{ width:50, borderRadius:13, alignItems:'center', justifyContent:'center',
            backgroundColor:C.gold + '18', borderWidth:1, borderColor:C.gold + '3D' }}>
          <Ionicons name="add" size={21} color={C.gold} />
        </TouchableOpacity>
      </View>

      <GoldButton label="Save day" onPress={() => onSave({ ...day, passage, reflection, prompts })}
        style={{ marginTop:26 }} />
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  GROUPS  —  a Bible community, not a Discord server
// ═══════════════════════════════════════════════════════════════════

function GroupsScreen({ user, groups, onNav, onRefresh, loading }) {
  const { C } = useSettings();
  const [joinCode, setJoin] = useState('');
  const [joining, setJoining] = useState(false);

  async function join() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      const snap = await getDocs(query(collection(db,'groups'), where('inviteCode','==',code)));
      if (snap.empty) { Alert.alert('No group found', 'Double-check the code with whoever invited you.'); setJoining(false); return; }
      const g = snap.docs[0];
      if ((user.groups || []).includes(g.id)) {
        Alert.alert('Already in', `You're already part of ${g.data().name}.`); setJoining(false); return;
      }
      await updateDoc(doc(db,'groups',g.id), { members: arrayUnion(user.uid) });
      await updateDoc(doc(db,'users',user.uid), { groups: arrayUnion(g.id) });
      setJoin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Welcome in', `You've joined ${g.data().name}.`);
    } catch (e) { Alert.alert('Could not join', e.message); }
    setJoining(false);
  }

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={loading}>
      <Header title="Groups"
        sub="Places where people keep gathering around the same Word."
        right={
          <TouchableOpacity onPress={() => onNav('groupCreate')}
            style={{ flexDirection:'row', alignItems:'center', gap:5,
              paddingVertical:8, paddingHorizontal:13, borderRadius:11,
              backgroundColor:C.tide + '14', borderWidth:1, borderColor:C.tide + '3D' }}>
            <Ionicons name="add" size={15} color={C.tide} />
            <Text style={{ fontFamily:F.bold, fontSize:12.5, color:C.tide }}>New</Text>
          </TouchableOpacity>
        }
      />

      <View style={{ flexDirection:'row', gap:9, marginBottom:22 }}>
        <TextInput value={joinCode} onChangeText={t => setJoin(t.toUpperCase())}
          style={[S(C).input, { flex:1, letterSpacing:2, fontFamily:F.bold }]}
          placeholder="INVITE CODE" placeholderTextColor={C.dim} autoCapitalize="characters" />
        <TouchableOpacity onPress={join} disabled={joining || !joinCode.trim()}
          style={{ paddingHorizontal:20, borderRadius:13, alignItems:'center', justifyContent:'center',
            backgroundColor: joinCode.trim() ? C.gold : C.raised }}>
          {joining ? <ActivityIndicator size="small" color={C.abyss} />
            : <Text style={{ fontFamily:F.heavy, fontSize:13.5,
                color: joinCode.trim() ? C.abyss : C.dim }}>Join</Text>}
        </TouchableOpacity>
      </View>

      {!groups.length ? (
        <Empty icon="⛪" title="No groups yet"
          body="Join with a code from your leader, or start one for your Bible study, youth group, or family."
          action={<GoldButton label="Create a group" icon="add" onPress={() => onNav('groupCreate')} />}
        />
      ) : groups.map(g => {
        const isOwner = g.ownerUid === user?.uid || g.adminUID === user?.uid;
        const isAdmin = (g.admins || []).includes(user?.uid);
        return (
          <Card key={g.id} onPress={() => onNav('groupDetail', { group: g })} style={{ marginBottom:11 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:13 }}>
              <View style={{ width:46, height:46, borderRadius:15, alignItems:'center', justifyContent:'center',
                backgroundColor:C.tide + '16', borderWidth:1, borderColor:C.tide + '33' }}>
                <Text style={{ fontSize:21 }}>{g.emoji || '⛪'}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:F.heavy, fontSize:15, color:C.text }}>{g.name}</Text>
                <Text style={[S(C).muted, { marginTop:3, fontSize:12 }]}>
                  {(g.members || []).length} {(g.members || []).length === 1 ? 'member' : 'members'}
                  {g.churchName ? ` · ${g.churchName}` : ''}
                </Text>
              </View>
              {(isOwner || isAdmin) && (
                <View style={{ backgroundColor:C.gold + '1C', borderRadius:7,
                  paddingHorizontal:8, paddingVertical:3.5 }}>
                  <Text style={{ fontSize:8.5, fontFamily:F.heavy, color:C.gold, letterSpacing:0.8 }}>
                    {isOwner ? 'OWNER' : 'ADMIN'}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

// ─── GROUP DETAIL ──────────────────────────────────────────────────
const GROUP_TABS = [
  { id:'about',   label:'About',   icon:'information-circle-outline' },
  { id:'plans',   label:'Plans',   icon:'book-outline'   },
  { id:'chat',    label:'Chat',    icon:'chatbubbles-outline' },
  { id:'prayer',  label:'Prayer',  icon:'hand-left-outline'   },
  { id:'members', label:'Members', icon:'people-outline' },
];

function GroupDetailScreen({ group: initial, user, onBack, onNav }) {
  const { C } = useSettings();
  const [group, setGroup] = useState(initial);
  const [tab, setTab]     = useState('about');
  const [members, setMembers] = useState([]);
  const [plans, setPlans]     = useState([]);
  const [msgs, setMsgs]       = useState([]);
  const [msg, setMsg]         = useState('');
  const [prayers, setPrayers] = useState([]);
  const [prayerText, setPT]   = useState('');

  const isOwner = group.ownerUid === user?.uid || group.adminUID === user?.uid;
  const isAdmin = isOwner || (group.admins || []).includes(user?.uid);

  useEffect(() => {
    if (!group.members?.length) return;
    Promise.all(group.members.map(u => getDoc(doc(db,'users',u))))
      .then(s => setMembers(s.filter(x => x.exists()).map(x => ({ uid:x.id, ...x.data() }))));
  }, [group.members]);

  useEffect(() => {
    const q = query(collection(db,'readingPlans'), where('groupId','==',group.id));
    return onSnapshot(q, s => setPlans(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
  }, [group.id]);

  useEffect(() => {
    if (tab !== 'chat') return;
    const q = query(collection(db,'groupMessages'), where('groupId','==',group.id), orderBy('createdAt','asc'), limit(120));
    return onSnapshot(q, s => setMsgs(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
  }, [group.id, tab]);

  useEffect(() => {
    if (tab !== 'prayer') return;
    const q = query(collection(db,'prayerRequests'), where('groupId','==',group.id), orderBy('createdAt','desc'), limit(60));
    return onSnapshot(q, s => setPrayers(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
  }, [group.id, tab]);

  async function send() {
    if (!msg.trim()) return;
    const body = msg.trim(); setMsg('');
    try {
      await addDoc(collection(db,'groupMessages'), {
        groupId: group.id, userId: user.uid, userName: user.name,
        userAvatarId: user.avatarId, userRole: user.role || 'member',
        text: body, createdAt: serverTimestamp(),
      });
    } catch { setMsg(body); }
  }

  async function addPrayer() {
    if (!prayerText.trim()) return;
    const body = prayerText.trim(); setPT('');
    try {
      await addDoc(collection(db,'prayerRequests'), {
        groupId: group.id, userId: user.uid, userName: user.name, userAvatarId: user.avatarId,
        text: body, prayedBy: [], answered: false, createdAt: serverTimestamp(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { setPT(body); }
  }

  async function togglePrayed(p) {
    const has = (p.prayedBy || []).includes(user.uid);
    try {
      await updateDoc(doc(db,'prayerRequests',p.id), {
        prayedBy: has ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
      Haptics.selectionAsync();
    } catch {}
  }

  async function copyCode() {
    await Clipboard.setStringAsync(group.inviteCode || '');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', `Invite code ${group.inviteCode} is on your clipboard.`);
  }

  return (
    <SafeAreaView style={S(C).safe} edges={['top']}>
      <View style={{ paddingHorizontal:22, paddingTop:12, paddingBottom:12,
        borderBottomWidth:1, borderBottomColor:C.hairline }}>
        <TouchableOpacity onPress={onBack}
          style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:10 }}>
          <Ionicons name="chevron-back" size={17} color={C.tide} />
          <Text style={{ color:C.tide, fontFamily:F.bold, fontSize:14 }}>Groups</Text>
        </TouchableOpacity>
        <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
          <View style={{ width:44, height:44, borderRadius:15, alignItems:'center', justifyContent:'center',
            backgroundColor:C.tide + '16', borderWidth:1, borderColor:C.tide + '33' }}>
            <Text style={{ fontSize:20 }}>{group.emoji || '⛪'}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ fontFamily:F.display, fontSize:22, color:C.text }}>{group.name}</Text>
            <Text style={[S(C).muted, { fontSize:12, marginTop:1 }]}>
              {(group.members || []).length} members
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap:8, paddingTop:14 }}>
          {GROUP_TABS.map(t => (
            <Chip key={t.id} label={t.label} icon={t.icon} tone="tide"
              active={tab === t.id} onPress={() => setTab(t.id)} small />
          ))}
        </ScrollView>
      </View>

      {/* ABOUT */}
      {tab === 'about' && (
        <ScrollView contentContainerStyle={{ padding:22, paddingBottom:120 }}>
          {group.description ? (
            <Card style={{ marginBottom:16 }}>
              <Text style={{ fontFamily:F.body, fontSize:14, color:C.text, lineHeight:22 }}>
                {group.description}
              </Text>
            </Card>
          ) : null}

          <Section tone="gold">Invite code</Section>
          <Card tone="gold" style={{ marginBottom:18 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
              <Text style={{ flex:1, fontFamily:F.black, fontSize:21, color:C.gold, letterSpacing:3.5 }}>
                {group.inviteCode}
              </Text>
              <TouchableOpacity onPress={copyCode}
                style={{ padding:11, borderRadius:12, backgroundColor:C.gold + '18' }}>
                <Ionicons name="copy-outline" size={18} color={C.gold} />
              </TouchableOpacity>
            </View>
            <Text style={[S(C).muted, { marginTop:9, fontSize:11.5 }]}>
              Anyone with this code can join. Share it in person or in a message.
            </Text>
          </Card>

          <Section>At a glance</Section>
          <View style={{ flexDirection:'row', gap:10 }}>
            {[
              { v: (group.members || []).length, l:'Members', c:C.tide },
              { v: plans.filter(p => p.status === 'published').length, l:'Plans', c:C.gold },
              { v: prayers.length, l:'Prayers', c:C.sage },
            ].map(s => (
              <View key={s.l} style={[S(C).card, { flex:1, alignItems:'center', paddingVertical:17 }]}>
                <Text style={{ fontFamily:F.display, fontSize:25, color:s.c }}>{s.v}</Text>
                <Text style={[S(C).muted, { marginTop:3, fontSize:11 }]}>{s.l}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* PLANS */}
      {tab === 'plans' && (
        <ScrollView contentContainerStyle={{ padding:22, paddingBottom:120 }}>
          {isAdmin && (
            <GoldButton label="New reading plan" icon="add" style={{ marginBottom:18 }}
              onPress={() => onNav('planBuilder', { groupId: group.id })} />
          )}
          {!plans.length ? (
            <Empty icon="📚" title="No plans in this group yet"
              body={isAdmin ? 'Create one — it takes under a minute.' : 'Your leader hasn\'t started one yet.'} />
          ) : plans.map(p => <PlanCard key={p.id} plan={p} user={user} onNav={onNav} draft={p.status === 'draft'} />)}
        </ScrollView>
      )}

      {/* CHAT */}
      {tab === 'chat' && (
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}>
          <FlatList
            data={msgs} keyExtractor={m => m.id}
            contentContainerStyle={{ padding:18, paddingBottom:16 }}
            ListEmptyComponent={
              <Empty icon="💬" title="Quiet in here"
                body="Say hello, ask a question, or share what stood out in today's reading." />
            }
            renderItem={({ item: m }) => {
              const mine = m.userId === user?.uid;
              const lead = m.userRole === 'admin' || m.userRole === 'leader';
              return (
                <View style={{ flexDirection:'row', gap:9, marginBottom:14,
                  justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  {!mine && <Avatar user={m} size={30} frame={false} />}
                  <View style={{ maxWidth:'76%' }}>
                    {!mine && (
                      <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginBottom:3 }}>
                        <Text style={{ fontFamily:F.heavy, fontSize:11.5, color:C.muted }}>{m.userName}</Text>
                        {lead && <Ionicons name="shield-checkmark" size={10} color={C.amethyst} />}
                      </View>
                    )}
                    <View style={{
                      backgroundColor: mine ? C.gold + '18' : C.surface,
                      borderWidth:1, borderColor: mine ? C.gold + '33' : C.line,
                      borderRadius:16, paddingHorizontal:13, paddingVertical:10,
                    }}>
                      <Text style={{ fontFamily:F.body, fontSize:14, color:C.text, lineHeight:21 }}>{m.text}</Text>
                    </View>
                    <Text style={{ fontFamily:F.body, fontSize:10, color:C.dim, marginTop:3,
                      textAlign: mine ? 'right' : 'left' }}>{timeAgo(m.createdAt)}</Text>
                  </View>
                </View>
              );
            }}
          />
          <View style={{ flexDirection:'row', gap:10, padding:14, alignItems:'flex-end',
            borderTopWidth:1, borderTopColor:C.hairline, backgroundColor:C.deep }}>
            <TextInput value={msg} onChangeText={setMsg} multiline
              style={[S(C).input, { flex:1, maxHeight:96, paddingVertical:11 }]}
              placeholder="Share something…" placeholderTextColor={C.dim} />
            <TouchableOpacity onPress={send} disabled={!msg.trim()}
              style={{ width:44, height:44, borderRadius:15, alignItems:'center', justifyContent:'center',
                backgroundColor: msg.trim() ? C.gold : C.raised }}>
              <Ionicons name="arrow-up" size={20} color={msg.trim() ? C.abyss : C.dim} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* PRAYER */}
      {tab === 'prayer' && (
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}>
          <FlatList
            data={prayers} keyExtractor={p => p.id}
            contentContainerStyle={{ padding:18, paddingBottom:16 }}
            ListEmptyComponent={
              <Empty icon="🙏" title="No prayer requests yet"
                body="Share what's on your heart. This group will carry it with you." />
            }
            renderItem={({ item: p }) => {
              const prayed = (p.prayedBy || []).includes(user?.uid);
              return (
                <Card style={{ marginBottom:10,
                  borderLeftWidth:3, borderLeftColor: p.answered ? C.sage : C.tide }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:9, marginBottom:8 }}>
                    <Avatar user={p} size={28} frame={false} />
                    <Text style={{ fontFamily:F.heavy, fontSize:13, color:C.text, flex:1 }}>{p.userName}</Text>
                    {p.answered && (
                      <View style={{ backgroundColor:C.sage + '20', borderRadius:7,
                        paddingHorizontal:8, paddingVertical:3 }}>
                        <Text style={{ fontSize:9, fontFamily:F.heavy, color:C.sage, letterSpacing:0.6 }}>ANSWERED</Text>
                      </View>
                    )}
                    <Text style={{ fontFamily:F.body, fontSize:10.5, color:C.dim }}>{timeAgo(p.createdAt)}</Text>
                  </View>
                  <Text style={{ fontFamily:F.body, fontSize:14, color:C.text, lineHeight:22 }}>{p.text}</Text>
                  <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
                    <TouchableOpacity onPress={() => togglePrayed(p)}
                      style={{ flexDirection:'row', alignItems:'center', gap:6,
                        paddingVertical:7, paddingHorizontal:13, borderRadius:999,
                        borderWidth:1, borderColor: prayed ? C.sage + '55' : C.line,
                        backgroundColor: prayed ? C.sage + '14' : 'transparent' }}>
                      <Text style={{ fontSize:13 }}>🙏</Text>
                      <Text style={{ fontFamily:F.bold, fontSize:12,
                        color: prayed ? C.sage : C.muted }}>
                        {prayed ? 'Praying' : 'Pray'}{(p.prayedBy || []).length ? ` · ${p.prayedBy.length}` : ''}
                      </Text>
                    </TouchableOpacity>
                    {p.userId === user?.uid && !p.answered && (
                      <TouchableOpacity
                        onPress={() => updateDoc(doc(db,'prayerRequests',p.id), { answered:true }).catch(()=>{})}
                        style={{ flexDirection:'row', alignItems:'center', gap:6,
                          paddingVertical:7, paddingHorizontal:13, borderRadius:999,
                          borderWidth:1, borderColor:C.line }}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={C.muted} />
                        <Text style={{ fontFamily:F.bold, fontSize:12, color:C.muted }}>Answered</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              );
            }}
          />
          <View style={{ flexDirection:'row', gap:10, padding:14, alignItems:'flex-end',
            borderTopWidth:1, borderTopColor:C.hairline, backgroundColor:C.deep }}>
            <TextInput value={prayerText} onChangeText={setPT} multiline
              style={[S(C).input, { flex:1, maxHeight:96, paddingVertical:11 }]}
              placeholder="Share a prayer request…" placeholderTextColor={C.dim} />
            <TouchableOpacity onPress={addPrayer} disabled={!prayerText.trim()}
              style={{ width:44, height:44, borderRadius:15, alignItems:'center', justifyContent:'center',
                backgroundColor: prayerText.trim() ? C.sage : C.raised }}>
              <Ionicons name="arrow-up" size={20} color={prayerText.trim() ? C.abyss : C.dim} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* MEMBERS */}
      {tab === 'members' && (
        <ScrollView contentContainerStyle={{ padding:22, paddingBottom:120 }}>
          {members.map(m => (
            <Card key={m.uid} style={{ marginBottom:9 }}
              onPress={() => onNav('userProfile', { uid: m.uid })}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                <Avatar user={m} size={40} />
                <View style={{ flex:1 }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>{m.name}</Text>
                  {m.username ? <Text style={[S(C).muted, { fontSize:12 }]}>@{m.username}</Text> : null}
                </View>
                {(m.currentStreak || 0) > 0 && (
                  <Text style={{ fontFamily:F.bold, fontSize:12, color:C.gold }}>🔥 {m.currentStreak}</Text>
                )}
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function GroupCreateScreen({ user, onBack, onDone }) {
  const { C } = useSettings();
  const [name, setName] = useState('');
  const [church, setChurch] = useState('');
  const [desc, setDesc] = useState('');
  const [emoji, setEmoji] = useState('⛪');
  const [isPublic, setPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const EMOJI = ['⛪','🔥','📖','✝️','🕊️','🌿','⭐','❤️','🙏','☕'];

  async function create() {
    if (!name.trim()) { Alert.alert('Name your group', 'Something short works best.'); return; }
    setSaving(true);
    try {
      const code = inviteCode();
      const ref  = doc(collection(db,'groups'));
      await setDoc(ref, {
        id: ref.id, name: name.trim(), churchName: church.trim() || null,
        description: desc.trim() || null, emoji, isPublic,
        inviteCode: code, ownerUid: user.uid, adminUID: user.uid,
        admins: [], members: [user.uid], createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db,'users',user.uid), { groups: arrayUnion(ref.id) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone(code);
    } catch (e) { Alert.alert('Could not create group', e.message); setSaving(false); }
  }

  return (
    <Screen scroll>
      <Header title="Start a group" onBack={onBack}
        sub="A place for your Bible study, youth group, family, or friends." />

      <Text style={S(C).label}>Icon</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:20 }}>
        {EMOJI.map(e => (
          <TouchableOpacity key={e} onPress={() => { Haptics.selectionAsync(); setEmoji(e); }}
            style={{ width:48, height:48, borderRadius:16, alignItems:'center', justifyContent:'center',
              backgroundColor: emoji === e ? C.tide + '1C' : C.raised,
              borderWidth:2, borderColor: emoji === e ? C.tide : C.line }}>
            <Text style={{ fontSize:21 }}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={S(C).label}>Group name</Text>
      <TextInput value={name} onChangeText={setName} style={S(C).input}
        placeholder="e.g. LifeStudents" placeholderTextColor={C.dim} />

      <Text style={[S(C).label, { marginTop:18 }]}>Church (optional)</Text>
      <TextInput value={church} onChangeText={setChurch} style={S(C).input}
        placeholder="e.g. Life Family Church" placeholderTextColor={C.dim} />

      <Text style={[S(C).label, { marginTop:18 }]}>Description (optional)</Text>
      <TextInput value={desc} onChangeText={setDesc} multiline
        style={[S(C).input, { minHeight:78, textAlignVertical:'top' }]}
        placeholder="What is this group for?" placeholderTextColor={C.dim} />

      <View style={[S(C).card, { flexDirection:'row', alignItems:'center', marginTop:20 }]}>
        <View style={{ flex:1 }}>
          <Text style={{ fontFamily:F.heavy, fontSize:13.5, color:C.text }}>Discoverable</Text>
          <Text style={[S(C).muted, { marginTop:2, fontSize:11.5 }]}>
            Let people find this group and request to join
          </Text>
        </View>
        <Switch value={isPublic} onValueChange={setPublic}
          trackColor={{ false:C.line, true:C.tide + '88' }}
          thumbColor={isPublic ? C.tide : C.dim} />
      </View>

      <GoldButton label="Create group" onPress={create} loading={saving}
        disabled={!name.trim()} style={{ marginTop:26 }} />
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  NOTIFICATIONS  —  invitations, never interruptions
// ═══════════════════════════════════════════════════════════════════
const NOTIF_META = {
  friendRequest:  { icon:'person-add-outline',   tone:'tide'     },
  friendAccepted: { icon:'people-outline',       tone:'tide'     },
  annotationReply:{ icon:'chatbubbles-outline',  tone:'gold'     },
  planInvite:     { icon:'book-outline',         tone:'gold'     },
  groupInvite:    { icon:'home-outline',         tone:'tide'     },
  prayerRequest:  { icon:'hand-left-outline',    tone:'sage'     },
  pinnedNote:     { icon:'bookmark-outline',     tone:'amethyst' },
  readingReminder:{ icon:'sunny-outline',        tone:'gold'     },
};

function NotificationsScreen({ user, onNav }) {
  const { C } = useSettings();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db,'notifications'), where('toUid','==',user.uid), orderBy('createdAt','desc'), limit(60));
    return onSnapshot(q, s => setItems(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
  }, [user?.uid]);

  useEffect(() => {
    const pending = user?.pendingRequests || [];
    if (!pending.length) { setRequests([]); return; }
    Promise.all(pending.map(u => getDoc(doc(db,'users',u))))
      .then(s => setRequests(s.filter(x => x.exists()).map(x => ({ uid:x.id, ...x.data() }))));
  }, [user?.pendingRequests]);

  async function markRead(n) {
    if (n.read) return;
    try { await updateDoc(doc(db,'notifications',n.id), { read:true }); } catch {}
  }

  return (
    <Screen scroll>
      <Header title="Notifications" sub="Gentle nudges back toward Scripture." />

      {requests.length > 0 && (
        <>
          <Section tone="tide">Friend requests</Section>
          {requests.map(r => (
            <Card key={r.uid} style={{ marginBottom:9 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                <Avatar user={r} size={40} />
                <View style={{ flex:1 }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>{r.name}</Text>
                  {r.username ? <Text style={[S(C).muted, { fontSize:12 }]}>@{r.username}</Text> : null}
                </View>
              </View>
              <View style={{ flexDirection:'row', gap:9, marginTop:12 }}>
                <TouchableOpacity onPress={() => acceptFriendRequest(r.uid, user.uid, user.name)}
                  style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center', backgroundColor:C.sage }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:13, color:C.abyss }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => declineFriendRequest(r.uid, user.uid)}
                  style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center',
                    borderWidth:1, borderColor:C.line }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:13, color:C.muted }}>Decline</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
          <View style={{ height:18 }} />
        </>
      )}

      {!items.length && !requests.length ? (
        <Empty icon="🔔" title="Nothing new"
          body="When friends share thoughts on a passage or your group starts a plan, you'll see it here." />
      ) : (
        <>
          {items.length > 0 && <Section>Recent</Section>}
          {items.map(n => {
            const meta = NOTIF_META[n.type] || { icon:'ellipse-outline', tone:'muted' };
            const col  = C[meta.tone] || C.muted;
            return (
              <TouchableOpacity key={n.id} onPress={() => markRead(n)}
                style={{ flexDirection:'row', gap:12, padding:14, borderRadius:15, marginBottom:8,
                  backgroundColor: n.read ? 'transparent' : C.surface,
                  borderWidth:1, borderColor: n.read ? C.hairline : C.line }}>
                <View style={{ width:36, height:36, borderRadius:12, alignItems:'center', justifyContent:'center',
                  backgroundColor: col + '16' }}>
                  <Ionicons name={meta.icon} size={17} color={col} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:13.5, color:C.text }}>{n.title}</Text>
                  {n.body ? <Text style={[S(C).muted, { marginTop:2, lineHeight:19 }]}>{n.body}</Text> : null}
                  <Text style={{ fontFamily:F.body, fontSize:10.5, color:C.dim, marginTop:5 }}>
                    {timeAgo(n.createdAt)}
                  </Text>
                </View>
                {!n.read && <View style={{ width:7, height:7, borderRadius:4, backgroundColor:C.gold, marginTop:6 }} />}
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PROFILE  —  the hub. Friends, Prayer, Study Rooms, History, Settings.
// ═══════════════════════════════════════════════════════════════════

function ProfileScreen({ user, onNav, onSignOut }) {
  const { C } = useSettings();
  const [showAvatar, setShowAvatar] = useState(false);
  const [showQR, setShowQR]         = useState(false);
  const [stats, setStats]           = useState({ chapters:0, highlights:0 });
  const fr = frameForStreak(user?.longestStreak || 0);

  useEffect(() => {
    if (!user?.uid) return;
    getRecents().then(r => setStats(s => ({ ...s, chapters: r.length })));
    const q = query(collection(db,'highlights'), where('userId','==',user.uid));
    return onSnapshot(q, snap => setStats(s => ({ ...s, highlights: snap.size })), () => {});
  }, [user?.uid]);

  const rows = [
    { id:'friends',   icon:'people-outline',       label:'Friends',        tone:'tide',
      right: `${(user?.friends || []).length}` },
    { id:'prayer',    icon:'hand-left-outline',    label:'Prayer',         tone:'sage'     },
    { id:'studyRooms',icon:'flame-outline',        label:'Study Rooms',    tone:'amethyst' },
    { id:'history',   icon:'time-outline',         label:'Reading history',tone:'gold'     },
    { id:'settings',  icon:'settings-outline',     label:'Settings',       tone:'muted'    },
  ];

  async function updateAvatar(id) {
    try { await updateDoc(doc(db,'users',user.uid), { avatarId: id }); setShowAvatar(false); } catch {}
  }

  return (
    <Screen scroll>
      <View style={{ alignItems:'center', paddingTop:22, paddingBottom:8 }}>
        <TouchableOpacity onPress={() => setShowAvatar(true)}>
          <View style={{
            width:92, height:92, borderRadius:30, alignItems:'center', justifyContent:'center',
            backgroundColor:C.raised,
            borderWidth: fr.ring ? 3 : 1, borderColor: fr.ring ? C[fr.ring] : C.line,
          }}>
            <Text style={{ fontSize:42 }}>{getAvatar(user?.avatarId).emoji}</Text>
          </View>
          <View style={{ position:'absolute', bottom:-2, right:-2, backgroundColor:C.surface,
            borderRadius:12, padding:6, borderWidth:1, borderColor:C.line }}>
            <Ionicons name="pencil" size={12} color={C.gold} />
          </View>
        </TouchableOpacity>

        <Text style={{ fontFamily:F.display, fontSize:26, color:C.text, marginTop:14 }}>{user?.name}</Text>
        {user?.username ? (
          <Text style={[S(C).muted, { marginTop:2, fontSize:13 }]}>@{user.username}</Text>
        ) : null}
        {fr.ring ? (
          <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:8,
            backgroundColor: C[fr.ring] + '16', borderRadius:999,
            paddingHorizontal:11, paddingVertical:4.5,
            borderWidth:1, borderColor: C[fr.ring] + '33' }}>
            <Ionicons name="ribbon-outline" size={11} color={C[fr.ring]} />
            <Text style={{ fontFamily:F.heavy, fontSize:10.5, color:C[fr.ring], letterSpacing:0.7 }}>
              {fr.label.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {user?.favoriteVerse ? (
          <Text style={{ fontFamily:F.scriptureItal, fontSize:13.5, color:C.muted,
            marginTop:12, textAlign:'center', paddingHorizontal:30, lineHeight:21 }}>
            "{user.favoriteVerse}"
          </Text>
        ) : null}

        <TouchableOpacity onPress={() => setShowQR(true)}
          style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:16,
            paddingHorizontal:20, paddingVertical:11, borderRadius:999,
            backgroundColor:C.gold + '12', borderWidth:1, borderColor:C.gold + '33' }}>
          <Ionicons name="qr-code-outline" size={17} color={C.gold} />
          <Text style={{ fontFamily:F.bold, fontSize:13.5, color:C.gold }}>My code</Text>
        </TouchableOpacity>
      </View>

      {/* stats — a journey, not a scoreboard */}
      <View style={{ flexDirection:'row', gap:9, marginTop:20, marginBottom:24 }}>
        {[
          { v:user?.currentStreak || 0,  l:'day streak', c:C.gold },
          { v:stats?.chapters || 0,      l:'chapters',   c:C.tide },
          { v:stats?.highlights || 0,    l:'highlights', c:C.sage },
        ].map(s => (
          <View key={s.l} style={[S(C).card, { flex:1, alignItems:'center', paddingVertical:16 }]}>
            <Text style={{ fontFamily:F.display, fontSize:24, color:s.c }}>{s.v}</Text>
            <Text style={[S(C).muted, { marginTop:2, fontSize:10.5 }]}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap:8 }}>
        {rows.map(r => (
          <TouchableOpacity key={r.id} onPress={() => onNav(r.id)}
            style={{ flexDirection:'row', alignItems:'center', gap:13, padding:15,
              borderRadius:15, backgroundColor:C.surface, borderWidth:1, borderColor:C.line }}>
            <View style={{ width:36, height:36, borderRadius:12, alignItems:'center', justifyContent:'center',
              backgroundColor: (C[r.tone] || C.muted) + '16' }}>
              <Ionicons name={r.icon} size={17} color={C[r.tone] || C.muted} />
            </View>
            <Text style={{ flex:1, fontFamily:F.bold, fontSize:14.5, color:C.text }}>{r.label}</Text>
            {r.right ? <Text style={[S(C).muted, { fontSize:13 }]}>{r.right}</Text> : null}
            <Ionicons name="chevron-forward" size={16} color={C.dim} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={onSignOut}
        style={{ marginTop:26, paddingVertical:14, borderRadius:15, alignItems:'center',
          borderWidth:1, borderColor:C.rose + '44' }}>
        <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.rose }}>Sign out</Text>
      </TouchableOpacity>

      <Text style={{ textAlign:'center', marginTop:22, fontFamily:F.body, fontSize:11, color:C.dim }}>
        LifeKindled 2.0 · Eternity Works
      </Text>

      <AvatarPicker visible={showAvatar} current={user?.avatarId}
        onSelect={updateAvatar} onClose={() => setShowAvatar(false)} />

      <Sheet visible={showQR} onClose={() => setShowQR(false)}>
        <View style={{ alignItems:'center' }}>
          <Avatar user={user} size={56} />
          <Text style={{ fontFamily:F.display, fontSize:22, color:C.text, marginTop:12 }}>{user?.name}</Text>
          {user?.username ? <Text style={[S(C).muted, { marginTop:2 }]}>@{user.username}</Text> : null}
          <View style={{ padding:18, backgroundColor:'#FFFFFF', borderRadius:22, marginTop:20 }}>
            <QRCode value={`lk://user/${user?.uid}`} size={196}
              color="#0B1524" backgroundColor="#FFFFFF" />
          </View>
          <Text style={[S(C).muted, { textAlign:'center', marginTop:16, lineHeight:20, maxWidth:250 }]}>
            Have someone scan this to connect. Fastest way to swap codes at church, camp, or a conference.
          </Text>
          <GhostButton label="Done" onPress={() => setShowQR(false)} style={{ marginTop:20, width:'100%' }} />
        </View>
      </Sheet>
    </Screen>
  );
}

// ─── FRIENDS ───────────────────────────────────────────────────────
function FriendsScreen({ user, onBack, onNav }) {
  const { C } = useSettings();
  const [term, setTerm]       = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSrch]  = useState(false);
  const [friends, setFriends] = useState([]);
  const [scanning, setScan]   = useState(false);

  useEffect(() => {
    const ids = user?.friends || [];
    if (!ids.length) { setFriends([]); return; }
    Promise.all(ids.map(u => getDoc(doc(db,'users',u))))
      .then(s => setFriends(s.filter(x => x.exists()).map(x => ({ uid:x.id, ...x.data() }))));
  }, [user?.friends]);

  useEffect(() => {
    if (term.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSrch(true);
      setResults(await searchUsers(term, user?.uid));
      setSrch(false);
    }, 420);
    return () => clearTimeout(t);
  }, [term]);

  function onScanned(data) {
    setScan(false);
    if (typeof data === 'string' && data.startsWith('lk://user/')) {
      onNav('userProfile', { uid: data.replace('lk://user/','') });
    } else {
      Alert.alert('Not a LifeKindled code', 'Try scanning the code from someone\'s profile.');
    }
  }

  return (
    <Screen scroll>
      <Header title="Friends" onBack={onBack}
        sub="People walking through Scripture alongside you."
        right={
          <TouchableOpacity onPress={() => setScan(true)}
            style={{ padding:9, borderRadius:12, backgroundColor:C.tide + '14',
              borderWidth:1, borderColor:C.tide + '33' }}>
            <Ionicons name="scan-outline" size={18} color={C.tide} />
          </TouchableOpacity>
        }
      />

      <View style={{ flexDirection:'row', alignItems:'center', gap:9, paddingHorizontal:13,
        borderRadius:14, backgroundColor:C.surface, borderWidth:1, borderColor:C.line, marginBottom:20 }}>
        <Ionicons name="search" size={17} color={C.dim} />
        <TextInput value={term} onChangeText={setTerm} autoCapitalize="none" autoCorrect={false}
          style={{ flex:1, paddingVertical:13, fontFamily:F.body, fontSize:14, color:C.text }}
          placeholder="Search by @username" placeholderTextColor={C.dim} />
        {searching && <ActivityIndicator size="small" color={C.tide} />}
      </View>

      {term.trim().length >= 2 && (
        <>
          <Section tone="tide">Results</Section>
          {!results.length && !searching ? (
            <Text style={[S(C).muted, { marginBottom:18 }]}>No one found for "@{term.trim()}"</Text>
          ) : results.map(u => (
            <Card key={u.uid} style={{ marginBottom:8 }} onPress={() => onNav('userProfile', { uid:u.uid })}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                <Avatar user={u} size={40} />
                <View style={{ flex:1 }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>{u.name}</Text>
                  <Text style={[S(C).muted, { fontSize:12 }]}>@{u.username}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.dim} />
              </View>
            </Card>
          ))}
          <View style={{ height:18 }} />
        </>
      )}

      <Section>{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</Section>
      {!friends.length ? (
        <Empty icon="👥" title="No friends yet"
          body="Scan someone's code or search their username. Friendships here are mutual — both people have to say yes."
          action={<GoldButton label="Scan a code" icon="scan-outline" onPress={() => setScan(true)} />}
        />
      ) : friends.map(f => (
        <Card key={f.uid} style={{ marginBottom:8 }} onPress={() => onNav('userProfile', { uid:f.uid })}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Avatar user={f} size={40} />
            <View style={{ flex:1 }}>
              <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>{f.name}</Text>
              {f.username ? <Text style={[S(C).muted, { fontSize:12 }]}>@{f.username}</Text> : null}
            </View>
            {(f.currentStreak || 0) > 0 && (
              <Text style={{ fontFamily:F.bold, fontSize:12.5, color:C.gold }}>🔥 {f.currentStreak}</Text>
            )}
          </View>
        </Card>
      ))}

      <QRScanner visible={scanning} onClose={() => setScan(false)} onScanned={onScanned} />
    </Screen>
  );
}

// ─── PUBLIC PROFILE ────────────────────────────────────────────────
function UserProfileScreen({ uid, user, onBack, onNav }) {
  const { C } = useSettings();
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

  const isFriend = (user?.friends || []).includes(uid);
  const isSelf   = uid === user?.uid;

  useEffect(() => {
    (async () => {
      try {
        const s = await getDoc(doc(db,'users',uid));
        if (s.exists()) setTarget({ uid, ...s.data() });
        const r = await getDoc(doc(db,'friendRequests',`${user?.uid}_${uid}`));
        setSent(r.exists() && r.data().status === 'pending');
      } catch {}
      setLoading(false);
    })();
  }, [uid]);

  if (loading) return (
    <Screen><View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator color={C.gold} size="large" /></View></Screen>
  );

  if (!target) return (
    <Screen scroll>
      <Header title="Not found" onBack={onBack} />
      <Empty icon="👤" title="We couldn't find that person" body="The code may be out of date." />
    </Screen>
  );

  const fr = frameForStreak(target.longestStreak || 0);

  return (
    <Screen scroll>
      <Header title="" onBack={onBack} />
      <View style={{ alignItems:'center', paddingTop:4 }}>
        <View style={{
          width:84, height:84, borderRadius:28, alignItems:'center', justifyContent:'center',
          backgroundColor:C.raised,
          borderWidth: fr.ring ? 3 : 1, borderColor: fr.ring ? C[fr.ring] : C.line,
        }}>
          <Text style={{ fontSize:38 }}>{getAvatar(target.avatarId).emoji}</Text>
        </View>
        <Text style={{ fontFamily:F.display, fontSize:25, color:C.text, marginTop:14 }}>{target.name}</Text>
        {target.username ? <Text style={[S(C).muted, { marginTop:2 }]}>@{target.username}</Text> : null}
        {target.bio ? (
          <Text style={[S(C).muted, { marginTop:10, textAlign:'center', maxWidth:270, lineHeight:20 }]}>
            {target.bio}
          </Text>
        ) : null}

        <View style={{ flexDirection:'row', gap:20, marginTop:18 }}>
          {[
            { v:target.currentStreak || 0, l:'streak',  c:C.gold },
            { v:target.longestStreak || 0, l:'best',    c:C.tide },
            { v:(target.friends || []).length, l:'friends', c:C.sage },
          ].map(s => (
            <View key={s.l} style={{ alignItems:'center' }}>
              <Text style={{ fontFamily:F.display, fontSize:21, color:s.c }}>{s.v}</Text>
              <Text style={[S(C).muted, { fontSize:11, marginTop:1 }]}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop:28 }}>
        {isSelf ? null : isFriend ? (
          <>
            <View style={[S(C).notice, { flexDirection:'row', alignItems:'center', gap:8,
              backgroundColor:C.sage + '10', borderColor:C.sage + '33', marginBottom:12 }]}>
              <Ionicons name="checkmark-circle" size={16} color={C.sage} />
              <Text style={{ fontFamily:F.bold, fontSize:13, color:C.sage }}>You're connected</Text>
            </View>
            <GhostButton label="Remove friend" tone="rose"
              onPress={() => Alert.alert('Remove friend?', `${target.name} will be removed from your friends.`, [
                { text:'Cancel', style:'cancel' },
                { text:'Remove', style:'destructive', onPress: async () => { await removeFriend(user.uid, uid); onBack(); } },
              ])} />
          </>
        ) : sent ? (
          <View style={[S(C).notice, { flexDirection:'row', alignItems:'center', gap:8 }]}>
            <Ionicons name="time-outline" size={16} color={C.gold} />
            <Text style={{ fontFamily:F.bold, fontSize:13, color:C.gold }}>Request sent</Text>
          </View>
        ) : (
          <GoldButton label="Add friend" icon="person-add-outline"
            onPress={async () => { await sendFriendRequest(user.uid, uid, user.name); setSent(true); }} />
        )}
      </View>
    </Screen>
  );
}

// ─── PRAYER CENTER ─────────────────────────────────────────────────
function PrayerScreen({ user, onBack, seedVerse }) {
  const { C } = useSettings();
  const [tab, setTab]     = useState('mine');
  const [entries, setEnt] = useState([]);
  const [text, setText]   = useState(seedVerse ? '' : '');
  const [saving, setSav]  = useState(false);
  const [timer, setTimer] = useState(0);
  const [running, setRun] = useState(false);
  const ref = useRef(null);

  useEffect(() => () => clearInterval(ref.current), []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db,'prayers'), where('userId','==',user.uid), orderBy('createdAt','desc'), limit(80));
    return onSnapshot(q, s => setEnt(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
  }, [user?.uid]);

  function toggleTimer() {
    if (running) {
      clearInterval(ref.current); setRun(false);
      if (timer >= 60) logHabit(user.uid, 'prayer', timer);
    } else {
      setRun(true);
      ref.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
  }

  async function save() {
    if (!text.trim()) return;
    setSav(true);
    try {
      await addDoc(collection(db,'prayers'), {
        userId:user.uid, text:text.trim(), answered:false,
        verseRef: seedVerse ? `${seedVerse.book} ${seedVerse.chapter}:${seedVerse.verse.verse}` : null,
        createdAt: serverTimestamp(),
      });
      await logHabit(user.uid, 'prayer', 0);
      setText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { Alert.alert('Could not save', e.message); }
    setSav(false);
  }

  const shown = tab === 'mine'     ? entries.filter(e => !e.answered)
              : tab === 'answered' ? entries.filter(e => e.answered)
              : entries;

  return (
    <Screen scroll>
      <Header title="Prayer" onBack={onBack}
        sub="Private by default. Bring what you want into the light." />

      <Card style={{ alignItems:'center', paddingVertical:24, marginBottom:20 }}>
        <Text style={{ fontFamily:F.display, fontSize:46, color: running ? C.sage : C.text, letterSpacing:2 }}>
          {fmtClock(timer)}
        </Text>
        <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
          <GhostButton label={running ? 'Pause' : timer > 0 ? 'Resume' : 'Begin'}
            tone="sage" onPress={toggleTimer} style={{ paddingHorizontal:30 }} />
          {timer > 0 && !running && (
            <GhostButton label="Reset" tone="muted" onPress={() => setTimer(0)} />
          )}
        </View>
      </Card>

      {seedVerse ? (
        <View style={[S(C).notice, { marginBottom:14 }]}>
          <Text style={{ fontFamily:F.bold, fontSize:12, color:C.gold }}>
            Praying from {seedVerse.book} {seedVerse.chapter}:{seedVerse.verse.verse}
          </Text>
        </View>
      ) : null}

      <TextInput value={text} onChangeText={setText} multiline
        style={[S(C).input, { minHeight:110, textAlignVertical:'top', lineHeight:21 }]}
        placeholder="Dear God…" placeholderTextColor={C.dim} />
      <GoldButton label="Save prayer" onPress={save} loading={saving}
        disabled={!text.trim()} style={{ marginTop:12 }} />

      <View style={{ flexDirection:'row', gap:8, marginTop:26, marginBottom:14 }}>
        {[
          { id:'mine',     label:'Praying'  },
          { id:'answered', label:'Answered' },
          { id:'all',      label:'All'      },
        ].map(t => (
          <Chip key={t.id} label={t.label} tone="sage" active={tab === t.id}
            onPress={() => setTab(t.id)} small />
        ))}
      </View>

      {!shown.length ? (
        <Empty icon="🕊️" title="Nothing here yet"
          body="Prayers you save show up here — and stay yours alone unless you share them." />
      ) : shown.map(p => (
        <Card key={p.id} style={{ marginBottom:9,
          borderLeftWidth:3, borderLeftColor: p.answered ? C.sage : C.gold }}>
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:7 }}>
            <Text style={[S(C).muted, { flex:1, fontSize:11.5 }]}>
              {p.verseRef ? `${p.verseRef} · ` : ''}{timeAgo(p.createdAt)}
            </Text>
            {!p.answered && (
              <TouchableOpacity onPress={() => updateDoc(doc(db,'prayers',p.id), { answered:true }).catch(()=>{})}
                hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name="checkmark-circle-outline" size={17} color={C.sage} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => deleteDoc(doc(db,'prayers',p.id)).catch(()=>{})}
              style={{ marginLeft:12 }} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="trash-outline" size={15} color={C.dim} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily:F.body, fontSize:14, color:C.text, lineHeight:22 }}>{p.text}</Text>
          {p.answered && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:9 }}>
              <Ionicons name="checkmark-circle" size={13} color={C.sage} />
              <Text style={{ fontFamily:F.bold, fontSize:11.5, color:C.sage }}>Answered</Text>
            </View>
          )}
        </Card>
      ))}
    </Screen>
  );
}

// ─── STUDY ROOMS (foundation) ──────────────────────────────────────
function StudyRoomsScreen({ user, onBack, onNav }) {
  const { C } = useSettings();
  return (
    <Screen scroll>
      <Header title="Study Rooms" onBack={onBack}
        sub="Temporary live Bible studies. Read, annotate, and pray together in real time." />
      <Card tone="amethyst" style={{ marginBottom:18 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:9 }}>
          <Ionicons name="flame" size={19} color={C.amethyst} />
          <Text style={{ fontFamily:F.heavy, fontSize:14.5, color:C.amethyst }}>Coming next</Text>
        </View>
        <Text style={{ fontFamily:F.body, fontSize:13.5, color:C.text, lineHeight:21 }}>
          Study Rooms let a group open the same passage at the same time — highlights appear live,
          discussion threads attach to individual verses, and everything is archived into the Shared
          Bible when the room ends.
        </Text>
      </Card>
      <Empty icon="🔥" title="No rooms yet"
        body="When Study Rooms open up, you'll be able to start one from any friend, group, or passage." />
    </Screen>
  );
}

// ─── READING HISTORY ───────────────────────────────────────────────
function HistoryScreen({ user, onBack, onNav }) {
  const { C } = useSettings();
  const [recents, setRecents] = useState([]);
  const [highlights, setHL]   = useState([]);
  const [notes, setNotes]     = useState([]);
  const [tab, setTab]         = useState('recent');

  useEffect(() => { getRecents().then(setRecents); }, []);
  useEffect(() => {
    if (!user?.uid) return;
    const q1 = query(collection(db,'highlights'), where('userId','==',user.uid), limit(100));
    const u1 = onSnapshot(q1, s => setHL(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
    const q2 = query(collection(db,'notes'), where('userId','==',user.uid), limit(100));
    const u2 = onSnapshot(q2, s => setNotes(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
    return () => { u1(); u2(); };
  }, [user?.uid]);

  return (
    <Screen scroll>
      <Header title="Reading history" onBack={onBack}
        sub="Where you've been, and what stood out along the way." />

      <View style={{ flexDirection:'row', gap:8, marginBottom:18 }}>
        {[
          { id:'recent',     label:'Recent'     },
          { id:'highlights', label:`Highlights ${highlights.length ? `· ${highlights.length}` : ''}` },
          { id:'notes',      label:`Notes ${notes.length ? `· ${notes.length}` : ''}` },
        ].map(t => (
          <Chip key={t.id} label={t.label} active={tab === t.id} onPress={() => setTab(t.id)} small />
        ))}
      </View>

      {tab === 'recent' && (!recents.length
        ? <Empty icon="📖" title="Nothing yet" body="Chapters you read will show up here." />
        : recents.map((r, i) => (
          <Card key={i} style={{ marginBottom:8 }}
            onPress={async () => { await saveLastRead(r.book, r.chapter, 'nlt'); onNav('bible'); }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
              <View style={{ width:38, height:38, borderRadius:13, alignItems:'center', justifyContent:'center',
                backgroundColor:C.gold + '14' }}>
                <Ionicons name="book-outline" size={17} color={C.gold} />
              </View>
              <Text style={{ flex:1, fontFamily:F.heavy, fontSize:14, color:C.text }}>
                {r.book} {r.chapter}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={C.dim} />
            </View>
          </Card>
        )))}

      {tab === 'highlights' && (!highlights.length
        ? <Empty icon="✦" title="No highlights yet" body="Tap any verse while reading to highlight it." />
        : highlights.map(h => (
          <Card key={h.id} style={{ marginBottom:8, borderLeftWidth:3, borderLeftColor:h.color }}>
            <Text style={{ fontFamily:F.heavy, fontSize:11, color:h.color, letterSpacing:0.8 }}>
              {h.book} {h.chapter}:{h.verseNum}
            </Text>
            <Text style={{ fontFamily:F.scriptureItal, fontSize:13.5, color:C.muted,
              marginTop:6, lineHeight:21 }} numberOfLines={3}>{h.verseText}</Text>
          </Card>
        )))}

      {tab === 'notes' && (!notes.length
        ? <Empty icon="✍️" title="No notes yet" body="Your private notes stay yours — write freely." />
        : notes.map(n => (
          <Card key={n.id} style={{ marginBottom:8 }}>
            <Text style={{ fontFamily:F.heavy, fontSize:11, color:C.gold, letterSpacing:0.8 }}>
              {n.book} {n.chapter}:{n.verseNum}
            </Text>
            <Text style={{ fontFamily:F.body, fontSize:13.5, color:C.text, marginTop:6, lineHeight:21 }}>
              {n.text}
            </Text>
          </Card>
        )))}
    </Screen>
  );
}

// ─── SETTINGS ──────────────────────────────────────────────────────
function SettingsScreen({ user, onBack, onSignOut }) {
  const { C, theme, setTheme, fontSize, setFontSize, serifMode, setSerifMode } = useSettings();
  const [confirmDelete, setCD] = useState(false);

  async function deleteAccount() {
    try {
      const current = auth.currentUser;
      if (current) await current.delete();          // auth first — if this fails, data survives
      if (user?.username) await deleteDoc(doc(db,'usernames',user.username.toLowerCase())).catch(()=>{});
      await deleteDoc(doc(db,'users',user.uid)).catch(()=>{});
      onSignOut();
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        Alert.alert('Sign in again first', 'For your security, sign out and back in before deleting your account.');
      } else {
        Alert.alert('Could not delete account', e.message);
      }
    }
  }

  return (
    <Screen scroll>
      <Header title="Settings" onBack={onBack} />

      <Section tone="gold">Reading</Section>
      <Card style={{ marginBottom:12 }}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <View style={{ flex:1 }}>
            <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>Serif Scripture</Text>
            <Text style={[S(C).muted, { marginTop:2, fontSize:11.5 }]}>Classic type for the biblical text</Text>
          </View>
          <Switch value={serifMode} onValueChange={setSerifMode}
            trackColor={{ false:C.line, true:C.gold + '88' }} thumbColor={serifMode ? C.gold : C.dim} />
        </View>
      </Card>

      <Card style={{ marginBottom:12 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:10 }}>
          <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>Text size</Text>
          <Text style={{ fontFamily:F.bold, fontSize:13, color:C.gold }}>{fontSize}pt</Text>
        </View>
        <Slider value={fontSize} onValueChange={setFontSize}
          minimumValue={14} maximumValue={24} step={1}
          minimumTrackTintColor={C.gold} maximumTrackTintColor={C.line} thumbTintColor={C.gold} />
        <Text style={{ fontFamily: serifMode ? F.scripture : F.body, fontSize: fontSize,
          lineHeight: fontSize * 1.7, color:C.parchment, marginTop:12 }}>
          The Lord is my shepherd; I shall not want.
        </Text>
      </Card>

      <Section>Appearance</Section>
      <Card style={{ marginBottom:22 }}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <View style={{ flex:1 }}>
            <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>Dark mode</Text>
            <Text style={[S(C).muted, { marginTop:2, fontSize:11.5 }]}>Easier on the eyes at night</Text>
          </View>
          <Switch value={theme === 'dark'} onValueChange={v => setTheme(v ? 'dark' : 'light')}
            trackColor={{ false:C.line, true:C.gold + '88' }} thumbColor={theme === 'dark' ? C.gold : C.dim} />
        </View>
      </Card>

      <Section tone="rose">Account</Section>
      <TouchableOpacity onPress={onSignOut}
        style={{ paddingVertical:14, borderRadius:15, alignItems:'center',
          borderWidth:1, borderColor:C.line, marginBottom:10 }}>
        <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.text }}>Sign out</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setCD(true)}
        style={{ paddingVertical:14, borderRadius:15, alignItems:'center',
          borderWidth:1, borderColor:C.rose + '44' }}>
        <Text style={{ fontFamily:F.heavy, fontSize:14, color:C.rose }}>Delete account</Text>
      </TouchableOpacity>

      <Text style={{ textAlign:'center', marginTop:26, fontFamily:F.body, fontSize:11, color:C.dim }}>
        LifeKindled 2.0
      </Text>

      <Sheet visible={confirmDelete} onClose={() => setCD(false)} maxHeight="45%">
        <Text style={S(C).sheetTitle}>Delete your account?</Text>
        <Text style={[S(C).muted, { marginTop:8, lineHeight:20 }]}>
          This permanently removes your profile, notes, highlights, and prayers. It cannot be undone.
        </Text>
        <View style={{ flexDirection:'row', gap:10, marginTop:22 }}>
          <GhostButton label="Cancel" tone="muted" style={{ flex:1 }} onPress={() => setCD(false)} />
          <TouchableOpacity onPress={() => { setCD(false); deleteAccount(); }}
            style={{ flex:1, paddingVertical:14, borderRadius:15, alignItems:'center', backgroundColor:C.rose }}>
            <Text style={{ fontFamily:F.heavy, fontSize:14, color:'#FFF' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Sheet>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SIGN IN
// ═══════════════════════════════════════════════════════════════════
function SignInScreen() {
  const { C } = useSettings();
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = (() => {
    if (!pw || pw.length < 6) return 0;
    let s = 1;
    if (pw.length >= 10) s++;
    if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
    return Math.min(s, 3);
  })();
  const sLabel = ['','Weak','Good','Strong'][strength];
  const sColor = ['', C.rose, C.gold, C.sage][strength];

  async function go() {
    if (!email.trim() || !pw) { Alert.alert('Almost there', 'Enter your email and password.'); return; }
    if (pw.length < 6) { Alert.alert('Password too short', 'Use at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (isNew) await createUserWithEmailAndPassword(auth, email.trim(), pw);
      else       await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch (e) {
      const msg =
        e.code === 'auth/user-not-found'       ? 'No account with that email.' :
        e.code === 'auth/wrong-password'       ? 'That password doesn\'t match.' :
        e.code === 'auth/invalid-credential'   ? 'Email or password is incorrect.' :
        e.code === 'auth/email-already-in-use' ? 'An account already exists with that email.' :
        e.code === 'auth/invalid-email'        ? 'That email doesn\'t look right.' :
        e.code === 'auth/weak-password'        ? 'Pick a stronger password.' :
        e.code === 'auth/network-request-failed' ? 'Network trouble — check your connection.' :
        'Something went wrong. Try again.';
      Alert.alert('Couldn\'t sign in', msg);
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:C.abyss }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex:1, justifyContent:'center', paddingHorizontal:32 }}>
        <View style={{ alignItems:'center', marginBottom:44 }}>
          <Image source={require('./assets/icon.png')}
            style={{ width:76, height:76, borderRadius:22 }} />
          <Text style={{ fontFamily:F.display, fontSize:36, color:C.text, marginTop:20 }}>LifeKindled</Text>
          <View style={{ height:1, width:58, backgroundColor:C.gold + '66', marginTop:12 }} />
          <Text style={{ fontFamily:F.scriptureItal, fontSize:14, color:C.muted, marginTop:12, textAlign:'center' }}>
            A Bible built for community
          </Text>
        </View>

        <View style={{ flexDirection:'row', backgroundColor:C.surface, borderRadius:14, padding:4,
          borderWidth:1, borderColor:C.line, marginBottom:16 }}>
          {[{ v:false, l:'Sign in' }, { v:true, l:'Create account' }].map(t => (
            <TouchableOpacity key={t.l} onPress={() => setIsNew(t.v)}
              style={{ flex:1, paddingVertical:11, borderRadius:11, alignItems:'center',
                backgroundColor: isNew === t.v ? C.gold : 'transparent' }}>
              <Text style={{ fontFamily:F.bold, fontSize:13.5,
                color: isNew === t.v ? C.abyss : C.muted }}>{t.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput value={email} onChangeText={setEmail} style={[S(C).input, { marginBottom:11 }]}
          placeholder="Email" placeholderTextColor={C.dim}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput value={pw} onChangeText={setPw} style={S(C).input}
          placeholder="Password" placeholderTextColor={C.dim} secureTextEntry />

        {isNew && pw.length > 0 && (
          <View style={{ marginTop:10 }}>
            <View style={{ flexDirection:'row', gap:5 }}>
              {[1,2,3].map(i => (
                <View key={i} style={{ flex:1, height:3, borderRadius:99,
                  backgroundColor: i <= strength ? sColor : C.line }} />
              ))}
            </View>
            <Text style={{ fontFamily:F.bold, fontSize:11, color:sColor, marginTop:6 }}>{sLabel}</Text>
          </View>
        )}

        <GoldButton label={isNew ? 'Create account' : 'Sign in'} onPress={go}
          loading={loading} style={{ marginTop:20 }} />
      </View>
      <Text style={{ position:'absolute', bottom:34, alignSelf:'center',
        fontFamily:F.body, fontSize:11, color:C.dim, letterSpacing:0.6 }}>
        {greeting()}.
      </Text>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  ONBOARDING  —  personal first. community when ready.
// ═══════════════════════════════════════════════════════════════════
function Onboarding({ firebaseUser, onDone }) {
  const { C } = useSettings();
  const [step, setStep]   = useState(0);
  const [name, setName]   = useState('');
  const [uname, setUname] = useState('');
  const [avail, setAvail] = useState(null);
  const [checking, setCk] = useState(false);
  const [avatarId, setAv] = useState('flame');
  const [saving, setSav]  = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue:1, duration:380, useNativeDriver:true }).start();
  }, [step]);

  useEffect(() => {
    if (uname.length < 3) { setAvail(null); return; }
    const t = setTimeout(async () => {
      setCk(true); setAvail(await usernameAvailable(uname)); setCk(false);
    }, 500);
    return () => clearTimeout(t);
  }, [uname]);

  async function finish(joinLater) {
    setSav(true);
    try {
      await setDoc(doc(db,'users',firebaseUser.uid), {
        uid: firebaseUser.uid, name: name.trim(),
        email: firebaseUser.email || '', username: uname || '',
        avatarId, role:'member',
        currentStreak:0, longestStreak:0,
        friends:[], pendingRequests:[], groups:[], plans:[],
        createdAt: serverTimestamp(),
      });
      if (uname) await claimUsername(uname, firebaseUser.uid);
      const s = await getDoc(doc(db,'users',firebaseUser.uid));
      onDone(s.exists() ? s.data() : { uid:firebaseUser.uid, name, username:uname, avatarId });
    } catch (e) { Alert.alert('Could not finish setup', e.message); setSav(false); }
  }

  // 0 — welcome
  if (step === 0) return (
    <View style={{ flex:1, backgroundColor:C.abyss, justifyContent:'center', paddingHorizontal:34 }}>
      <Animated.View style={{ flex:1, opacity:fade }}>
        <View style={{ flex:1, justifyContent:'center' }}>
          <Image source={require('./assets/icon.png')}
            style={{ width:70, height:70, borderRadius:21, marginBottom:30 }} />
          <Text style={{ fontFamily:F.display, fontSize:36, color:C.text, lineHeight:44 }}>
            The Bible{'\n'}is the campfire.
          </Text>
          <View style={{ height:1, width:58, backgroundColor:C.gold + '66', marginTop:18, marginBottom:18 }} />
          <Text style={{ fontFamily:F.body, fontSize:15.5, color:C.muted, lineHeight:25 }}>
            People gather around it. They ask questions, encourage each other, and sit with what they read.
            {'\n\n'}Everything in LifeKindled exists to help you gather around God's Word — never to compete with it.
          </Text>
          <GoldButton label="Let's begin" onPress={() => setStep(1)} style={{ marginTop:40 }} />
        </View>
      </Animated.View>
    </View>
  );

  // 1 — name
  if (step === 1) return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:C.abyss }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View style={{ flex:1, opacity:fade }}>
        <View style={{ flex:1, justifyContent:'center', paddingHorizontal:34 }}>
          <Text style={S(C).step}>Step 1 of 3</Text>
          <Text style={{ fontFamily:F.display, fontSize:33, color:C.text, marginTop:14 }}>
            What should we call you?
          </Text>
          <Text style={[S(C).muted, { marginTop:12, marginBottom:28, lineHeight:21 }]}>
            This is how friends will recognize you.
          </Text>
          <TextInput value={name} onChangeText={setName} autoFocus autoCapitalize="words"
            style={[S(C).input, { fontSize:19, paddingVertical:17, textAlign:'center', fontFamily:F.bold }]}
            placeholder="Your name" placeholderTextColor={C.dim}
            onSubmitEditing={() => name.trim() && setStep(2)} />
          <GoldButton label="Continue" onPress={() => name.trim() && setStep(2)}
            disabled={!name.trim()} style={{ marginTop:22 }} />
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );

  // 2 — username
  if (step === 2) {
    const valid = usernameValid(uname);
    return (
      <KeyboardAvoidingView style={{ flex:1, backgroundColor:C.abyss }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ flex:1, opacity:fade }}>
          <View style={{ flex:1, justifyContent:'center', paddingHorizontal:34 }}>
            <Text style={S(C).step}>Step 2 of 3</Text>
            <Text style={{ fontFamily:F.display, fontSize:33, color:C.text, marginTop:14 }}>
              Pick a username.
            </Text>
            <Text style={[S(C).muted, { marginTop:12, marginBottom:26, lineHeight:21 }]}>
              How people find you without sharing anything personal. Letters, numbers, dots, underscores.
            </Text>
            <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16,
              borderRadius:14, backgroundColor:C.surface, borderWidth:1.5,
              borderColor: avail === false ? C.rose : avail === true ? C.sage : C.line }}>
              <Text style={{ fontFamily:F.bold, fontSize:19, color:C.gold }}>@</Text>
              <TextInput value={uname} autoCapitalize="none" autoCorrect={false} maxLength={20}
                onChangeText={t => setUname(t.replace(/[^a-zA-Z0-9_.]/g,'').toLowerCase())}
                style={{ flex:1, paddingVertical:16, fontFamily:F.bold, fontSize:19, color:C.text }}
                placeholder="yourname" placeholderTextColor={C.dim} />
              {checking && <ActivityIndicator size="small" color={C.gold} />}
              {!checking && avail === true  && <Ionicons name="checkmark-circle" size={21} color={C.sage} />}
              {!checking && avail === false && <Ionicons name="close-circle" size={21} color={C.rose} />}
            </View>
            {avail === false && (
              <Text style={{ fontFamily:F.bold, fontSize:12, color:C.rose, marginTop:9 }}>
                Taken — try another.
              </Text>
            )}
            {avail === true && (
              <Text style={{ fontFamily:F.bold, fontSize:12, color:C.sage, marginTop:9 }}>
                @{uname} is yours.
              </Text>
            )}
            <GoldButton label="Continue" onPress={() => setStep(3)}
              disabled={!(avail && valid)} style={{ marginTop:22 }} />
            <TouchableOpacity onPress={() => { setUname(''); setStep(3); }}
              style={{ marginTop:16, alignItems:'center' }}>
              <Text style={[S(C).muted, { fontSize:13.5 }]}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // 3 — avatar
  if (step === 3) return (
    <View style={{ flex:1, backgroundColor:C.abyss, paddingHorizontal:30, paddingTop:74 }}>
      <Animated.View style={{ flex:1, opacity:fade }}>
        <Text style={S(C).step}>Step 3 of 3</Text>
        <Text style={{ fontFamily:F.display, fontSize:33, color:C.text, marginTop:14 }}>
          Choose your avatar.
        </Text>
        <Text style={[S(C).muted, { marginTop:12, lineHeight:21 }]}>
          You can change it any time.
        </Text>
        <View style={{ alignItems:'center', marginVertical:26 }}>
          <View style={{ width:88, height:88, borderRadius:29, alignItems:'center', justifyContent:'center',
            backgroundColor:C.raised, borderWidth:2, borderColor:C.gold }}>
            <Text style={{ fontSize:42 }}>{getAvatar(avatarId).emoji}</Text>
          </View>
          <Text style={[S(C).muted, { marginTop:10 }]}>{name}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
            {AVATARS.map(a => {
              const on = avatarId === a.id;
              return (
                <TouchableOpacity key={a.id}
                  onPress={() => { Haptics.selectionAsync(); setAv(a.id); }}
                  style={{ width:62, height:62, borderRadius:20, alignItems:'center', justifyContent:'center',
                    backgroundColor: on ? C.gold + '1C' : C.surface,
                    borderWidth:2, borderColor: on ? C.gold : C.line }}>
                  <Text style={{ fontSize:27 }}>{a.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <GoldButton label="Open my Bible" onPress={() => finish(true)}
            loading={saving} style={{ marginTop:32, marginBottom:40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════
const TABS = [
  { id:'bible',   icon:'book',          label:'Bible'  },
  { id:'plans',   icon:'albums',        label:'Plans'  },
  { id:'groups',  icon:'people',        label:'Groups' },
  { id:'alerts',  icon:'notifications', label:'Alerts' },
  { id:'me',      icon:'person',        label:'Profile'},
];
const ROOT_TABS = TABS.map(t => t.id);

function TabBar({ active, onNav, unread }) {
  const { C } = useSettings();
  return (
    <View style={{
      flexDirection:'row', alignItems:'center', justifyContent:'space-around',
      paddingTop:9, paddingBottom:Platform.OS === 'ios' ? 24 : 11,
      backgroundColor:C.deep, borderTopWidth:1, borderTopColor:C.hairline,
    }}>
      {TABS.map(t => {
        const on = active === t.id;
        return (
          <TouchableOpacity key={t.id} onPress={() => { Haptics.selectionAsync(); onNav(t.id); }}
            style={{ alignItems:'center', paddingHorizontal:9, minWidth:60 }}>
            <View>
              <Ionicons name={on ? t.icon : `${t.icon}-outline`} size={22}
                color={on ? C.gold : C.dim} />
              {t.id === 'alerts' && unread > 0 && (
                <View style={{ position:'absolute', top:-3, right:-6, minWidth:15, height:15,
                  borderRadius:8, backgroundColor:C.rose, alignItems:'center', justifyContent:'center',
                  paddingHorizontal:3.5 }}>
                  <Text style={{ fontFamily:F.heavy, fontSize:9, color:'#FFF' }}>
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontFamily: on ? F.heavy : F.body, fontSize:9.5, marginTop:3.5,
              color: on ? C.gold : C.dim, letterSpacing:0.3 }}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════════════
function Shell({ fbUser, user, setUser, onSignOut }) {
  const { C } = useSettings();
  const [screen, setScreen] = useState('bible');
  const [params, setParams] = useState({});
  const [stack, setStack]   = useState([]);
  const [groups, setGroups] = useState([]);
  const [plans, setPlans]   = useState([]);
  const [unread, setUnread] = useState(0);
  const [offline, setOff]   = useState(false);
  const [loadingData, setLD]= useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  // live user doc
  useEffect(() => {
    if (!fbUser?.uid) return;
    return onSnapshot(doc(db,'users',fbUser.uid), s => {
      if (s.exists()) setUser({ uid: s.id, ...s.data() });
    }, () => {});
  }, [fbUser?.uid]);

  useEffect(() => {
    const ids = user?.groups || [];
    if (!ids.length) { setGroups([]); return; }
    Promise.all(ids.map(g => getDoc(doc(db,'groups',g))))
      .then(s => setGroups(s.filter(x => x.exists()).map(x => ({ id:x.id, ...x.data() }))));
  }, [user?.groups]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db,'readingPlans'), where('members','array-contains', user.uid));
    return onSnapshot(q, s => setPlans(s.docs.map(d => ({ id:d.id, ...d.data() }))), () => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db,'notifications'), where('toUid','==',user.uid), where('read','==',false));
    return onSnapshot(q, s => setUnread(s.size + (user?.pendingRequests || []).length), () => setUnread(0));
  }, [user?.uid, user?.pendingRequests]);

  useEffect(() => NetInfo.addEventListener(s => setOff(!s.isConnected)), []);

  function nav(id, p = {}) {
    Animated.timing(fade, { toValue:0, duration:70, useNativeDriver:true }).start(() => {
      if (ROOT_TABS.includes(id)) setStack([]);
      else setStack(s => [...s, { screen, params }]);
      setScreen(id); setParams(p);
      Animated.timing(fade, { toValue:1, duration:170, useNativeDriver:true }).start();
    });
  }
  function back() {
    const prev = stack[stack.length - 1];
    Animated.timing(fade, { toValue:0, duration:70, useNativeDriver:true }).start(() => {
      if (prev) { setScreen(prev.screen); setParams(prev.params); setStack(s => s.slice(0, -1)); }
      else { setScreen('bible'); setParams({}); }
      Animated.timing(fade, { toValue:1, duration:170, useNativeDriver:true }).start();
    });
  }

  const todaysReading = useMemo(() => {
    for (const p of plans) {
      if (p.status !== 'published') continue;
      const d = (p.days || []).find(x => x.date === todayStr() && !x.rest && x.passage);
      if (d) return d;
    }
    return null;
  }, [plans]);

  function render() {
    switch (screen) {
      case 'bible':   return <BibleScreen user={user} onNav={nav} todaysReading={todaysReading} />;
      case 'plans':   return <PlansScreen user={user} plans={plans} onNav={nav} loading={loadingData} />;
      case 'groups':  return <GroupsScreen user={user} groups={groups} onNav={nav} loading={loadingData} />;
      case 'alerts':  return <NotificationsScreen user={user} onNav={nav} />;
      case 'me':      return <ProfileScreen user={user} onNav={nav} onSignOut={onSignOut} />;

      case 'planDetail':  return <PlanDetailScreen plan={params.plan} user={user} onBack={back} onNav={nav} />;
      case 'planBuilder': return <PlanBuilderScreen plan={params.plan} user={user} groups={groups}
                                   onBack={back} onDone={() => nav('plans')} />;
      case 'groupDetail': return <GroupDetailScreen group={params.group} user={user} onBack={back} onNav={nav} />;
      case 'groupCreate': return <GroupCreateScreen user={user} onBack={back}
                                   onDone={code => { nav('groups'); setTimeout(() =>
                                     Alert.alert('Group created', `Invite code: ${code}\n\nShare it with whoever you want in.`), 350); }} />;
      case 'friends':     return <FriendsScreen user={user} onBack={back} onNav={nav} />;
      case 'userProfile': return <UserProfileScreen uid={params.uid} user={user} onBack={back} onNav={nav} />;
      case 'prayer':      return <PrayerScreen user={user} onBack={back} seedVerse={params.verse ? params : null} />;
      case 'studyRooms':  return <StudyRoomsScreen user={user} onBack={back} onNav={nav} />;
      case 'history':     return <HistoryScreen user={user} onBack={back} onNav={nav} />;
      case 'settings':    return <SettingsScreen user={user} onBack={back} onSignOut={onSignOut} />;
      default:            return <BibleScreen user={user} onNav={nav} todaysReading={todaysReading} />;
    }
  }

  return (
    <View style={{ flex:1, backgroundColor:C.abyss }}>
      {offline && (
        <View style={{ backgroundColor:C.raised, paddingVertical:5, alignItems:'center' }}>
          <Text style={{ fontFamily:F.bold, fontSize:10.5, color:C.muted }}>
            Offline — reading still works
          </Text>
        </View>
      )}
      <Animated.View style={{ flex:1, opacity:fade }}>{render()}</Animated.View>
      {ROOT_TABS.includes(screen) && <TabBar active={screen} onNav={nav} unread={unread} />}
    </View>
  );
}

export default function App() {
  const [fbUser, setFbUser]       = useState(null);
  const [user, setUser]           = useState(null);
  const [booting, setBooting]     = useState(true);
  const [needsSetup, setNeeds]    = useState(false);
  const setupRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
    PlayfairDisplay_400Regular, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic,
  });

  useEffect(() => onAuthStateChanged(auth, async u => {
    if (u) {
      setFbUser(u);
      if (setupRef.current) { setBooting(false); return; }
      try {
        const s = await getDoc(doc(db,'users',u.uid));
        if (s.exists()) { setUser({ uid:u.uid, ...s.data() }); setNeeds(false); }
        else { setupRef.current = true; setNeeds(true); }
      } catch { setupRef.current = true; setNeeds(true); }
    } else if (!setupRef.current) {
      setFbUser(null); setUser(null); setNeeds(false);
    }
    setBooting(false);
  }), []);

  async function handleSignOut() {
    try { await signOut(auth); } catch {}
    setupRef.current = false;
    setUser(null); setFbUser(null); setNeeds(false);
  }

  return (
    <SettingsProvider>
      <SafeAreaProvider>
        <Root
          fontsLoaded={fontsLoaded} booting={booting}
          fbUser={fbUser} user={user} setUser={setUser}
          needsSetup={needsSetup}
          onSetupDone={u => { setUser(u); setNeeds(false); setupRef.current = false; }}
          onSignOut={handleSignOut}
        />
      </SafeAreaProvider>
    </SettingsProvider>
  );
}

function Root({ fontsLoaded, booting, fbUser, user, setUser, needsSetup, onSetupDone, onSignOut }) {
  const { C } = useSettings();

  if (!fontsLoaded || booting) return (
    <View style={{ flex:1, backgroundColor:C.abyss, alignItems:'center', justifyContent:'center' }}>
      <Image source={require('./assets/icon.png')} style={{ width:64, height:64, borderRadius:19 }} />
      <ActivityIndicator color={C.gold} style={{ marginTop:22 }} />
    </View>
  );

  return (
    <>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.abyss} />
      {!fbUser ? <SignInScreen />
        : needsSetup ? <Onboarding firebaseUser={fbUser} onDone={onSetupDone} />
        : user ? <Shell fbUser={fbUser} user={user} setUser={setUser} onSignOut={onSignOut} />
        : (
          <View style={{ flex:1, backgroundColor:C.abyss, alignItems:'center', justifyContent:'center' }}>
            <ActivityIndicator color={C.gold} size="large" />
          </View>
        )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════
const S = (C) => StyleSheet.create({
  safe:       { flex:1, backgroundColor:C.abyss },
  pad:        { paddingHorizontal:22 },

  h1:         { fontFamily:F.display, fontSize:29, color:C.text, lineHeight:36 },
  rule:       { height:1, width:46, backgroundColor:C.gold + '66', marginTop:11 },
  muted:      { fontFamily:F.body, fontSize:12.5, color:C.muted },
  label:      { fontFamily:F.heavy, fontSize:10, letterSpacing:1.6, color:C.dim,
                textTransform:'uppercase', marginBottom:8 },
  step:       { fontFamily:F.heavy, fontSize:11, letterSpacing:2, color:C.gold, textTransform:'uppercase' },

  card:       { backgroundColor:C.surface, borderRadius:18, padding:16,
                borderWidth:1, borderColor:C.line },
  notice:     { backgroundColor:C.gold + '0E', borderRadius:14, padding:13,
                borderWidth:1, borderColor:C.gold + '2E' },

  input:      { backgroundColor:C.surface, borderRadius:14, borderWidth:1, borderColor:C.line,
                paddingHorizontal:15, paddingVertical:14,
                fontFamily:F.body, fontSize:14.5, color:C.text },

  goldBtn:    { borderRadius:15, paddingVertical:15, alignItems:'center', justifyContent:'center' },
  goldBtnTxt: { fontFamily:F.heavy, fontSize:15, color:C.abyss },
  ghostBtn:   { borderRadius:15, paddingVertical:13.5, alignItems:'center',
                justifyContent:'center', borderWidth:1.5 },
  ghostBtnTxt:{ fontFamily:F.heavy, fontSize:14 },

  chNav:      { flex:1, flexDirection:'row', alignItems:'center', gap:6, paddingVertical:14,
                paddingHorizontal:15, borderRadius:15,
                backgroundColor:C.surface, borderWidth:1, borderColor:C.line },

  sheet:      { backgroundColor:C.deep, borderTopLeftRadius:28, borderTopRightRadius:28,
                paddingHorizontal:24, paddingTop:12, paddingBottom:40,
                borderWidth:1, borderBottomWidth:0, borderColor:C.line },
  grabber:    { width:38, height:4, borderRadius:99, backgroundColor:C.line,
                alignSelf:'center', marginBottom:18 },
  sheetTitle: { fontFamily:F.display, fontSize:21, color:C.text },
});