import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp, 
  getDocs,
  deleteDoc,
  getDoc,
  setDoc,
  increment,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, getDocFromCache, getDocsFromCache } from './firebase';
import { 
  Vote, 
  User as UserIcon, 
  Trophy, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  School,
  ShieldCheck,
  UserCheck,
  Edit2,
  Cloud,
  CloudOff,
  Zap,
  RotateCcw,
  Info,
  Home as HomeIcon,
  ArrowLeft,
  AlertTriangle,
  LayoutGrid,
  Database,
  Layout,
  AlertCircle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { registerSW } from 'virtual:pwa-register';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Constants ---
const GRADES = ['3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°'];
const MASTER_PIN = '2026ADMIN'; // Default master pin

const INITIAL_MESAS = [
  { name: "Mesa 01 - Principal", grade: "7°", pin: "sp07" },
  { name: "Mesa 02 - Principal", grade: "8°", pin: "SP08" },
  { name: "Mesa 03 - Pricipal", grade: "9°", pin: "sp09" },
  { name: "Mesa 04 - Principal", grade: "10°", pin: "sp10" },
  { name: "Mesa 05 - Principal", grade: "11°", pin: "sp11" },
  { name: "Mesa 06 - Principal", grade: "4°", pin: "sp04" },
  { name: "Mesa 07 - Principal", grade: "5°", pin: "sp05" },
  { name: "Mesa 01 - 2 de septiembre", grade: "3°", pin: "ds03" },
  { name: "Mesa 02 - 2 de septiembre", grade: "3°", pin: "ds03" },
  { name: "Mesa 01 - Alfonso Lopez", grade: "3°", pin: "al03" },
  { name: "Mesa 02 - Alfonso Lopez", grade: "6°", pin: "al06" }
];

const INITIAL_CANDIDATES = [
  // Personería
  { name: "EDGAR JOEL VERTEL TORRES", position: "personeria", grade: "General", number: 1 },
  { name: "LUIS MATEO PEÑA MERCADO", position: "personeria", grade: "General", number: 2 },
  { name: "CRISTIAN LOPEZ ECHEVERRY", position: "personeria", grade: "General", number: 3 },
  // Contraloría
  { name: "CASTRO GONZALEZ BELLYS SOFIA", position: "contraloria", grade: "General", number: 1 },
  { name: "PADILLA MENDOZA YESID DAVID", position: "contraloria", grade: "General", number: 2 },
  { name: "CONTRERAS CASTAÑO JUAN JOSE", position: "contraloria", grade: "General", number: 3 },
  // Consejo 9°
  { name: "HOYOLA MIRANDA ANTONELA", grade: "9°", position: "consejo", number: 1 },
  { name: "MARTINEZ HERRERA LUIS ANGEL", grade: "9°", position: "consejo", number: 2 },
  { name: "FLORES UBARNES KHANDY SOFIA", grade: "9°", position: "consejo", number: 3 },
  { name: "REYES PASTRANA ROSA ISABEL", grade: "9°", position: "consejo", number: 4 },
  { name: "MORALES GUZMAN LUISA FERNADA", grade: "9°", position: "consejo", number: 5 },
  // Consejo 4°
  { name: "COGOLLO VARGAS ELIAN DAVID", grade: "4°", position: "consejo", number: 1 },
  { name: "COGOLLO CARPIO SAMARA MICHEL", grade: "4°", position: "consejo", number: 2 },
  { name: "MORALES CAMAÑO KIARA", grade: "4°", position: "consejo", number: 3 },
  { name: "CASTILLO LOPEZ JOSE DAVID", grade: "4°", position: "consejo", number: 4 },
  { name: "GOMÉZ TERAN KEISY", grade: "4°", position: "consejo", number: 5 },
  { name: "SUAREZ HERRERA MILAN ANDRES", grade: "4°", position: "consejo", number: 6 },
  // Consejo 8°
  { name: "MARTINEZ LONDOÑO CELESTE", grade: "8°", position: "consejo", number: 1 },
  { name: "MORALES CAMAÑO DUVÁN", grade: "8°", position: "consejo", number: 2 },
  { name: "VILLEGAS DORIA CAMILO ANDRES", grade: "8°", position: "consejo", number: 3 },
  { name: "VILORIA JULIO LUIS DAVID", grade: "8°", position: "consejo", number: 4 },
  { name: "DIAZ DOMINGUEZ ROSALÍA", grade: "8°", position: "consejo", number: 5 },
  { name: "RUIZ GUZMAN ANA KARINA", grade: "8°", position: "consejo", number: 6 },
  // Consejo 5°
  { name: "HERRERA MARTINEZ DAYANA", grade: "5°", position: "consejo", number: 1 },
  { name: "COGOLLO TORRES MAUREN JOSÉ", grade: "5°", position: "consejo", number: 2 },
  { name: "MONTALVO LOPEZ MARIAN SARAY", grade: "5°", position: "consejo", number: 3 },
  { name: "MORALES ESPITIA MARIANA", grade: "5°", position: "consejo", number: 4 },
  { name: "JAMER DAVID MONTALVO MEZA", grade: "5°", position: "consejo", number: 5 },
  // Consejo 7°
  { name: "YEPES CASARUBIA AURI ESTELA", grade: "7°", position: "consejo", number: 1 },
  { name: "MARTINEZ MIGUEL ANDRES", grade: "7°", position: "consejo", number: 2 },
  { name: "PEÑATE MORELO MARIA ANGEL", grade: "7°", position: "consejo", number: 3 },
  { name: "ALEJO CALZADILLA MARIANGEL", grade: "7°", position: "consejo", number: 4 },
  { name: "RIVAS ARIETA NEIMAR ANDRES", grade: "7°", position: "consejo", number: 5 },
  { name: "MACHADO LOZADA EFRAIN DANIEL", grade: "7°", position: "consejo", number: 6 },
  // Consejo 3°
  { name: "KATIUSCA URDANETAS NAVAS", grade: "3°", position: "consejo", number: 1 },
  { name: "YURAIDIS MARIA MERCADO MORALES", grade: "3°", position: "consejo", number: 2 },
  { name: "CASTRILLON RIVAS FREDDIER", grade: "3°", position: "consejo", number: 3 },
  // Consejo 6°
  { name: "FUENTES VILLEGAS WENDERLYS", grade: "6°", position: "consejo", number: 1 },
  { name: "LAZARO CRISTINA ISABEL", grade: "6°", position: "consejo", number: 2 },
  { name: "GALARCIO MORELO JULIANA MAIREL", grade: "6°", position: "consejo", number: 3 },
  { name: "MENDOZA SANCHEZ ANDERSON DAVID", grade: "6°", position: "consejo", number: 4 },
  { name: "FERNANDEZ DORIA SHAROL JULIANA", grade: "6°", position: "consejo", number: 5 },
  { name: "ARAUJO REYES DELIANNIS NICOL", grade: "6°", position: "consejo", number: 6 },
  // Consejo 10°
  { name: "LOPEZ MULASCO MELISSA ANDREA", grade: "10°", position: "consejo", number: 1 },
  { name: "PAEZ MARTINEZ JUAN PABLO", grade: "10°", position: "consejo", number: 2 },
  { name: "PERERIRA GUEVARA ANDREA PAOLA", grade: "10°", position: "consejo", number: 3 },
  // Consejo 11°
  { name: "RESTREPO LEDESMA GUSTAVO", grade: "11°", position: "consejo", number: 1 },
  { name: "SEPULVEDA ALVAREZ SILVANA", grade: "11°", position: "consejo", number: 2 },
  { name: "LLORENTE PETRO DANA", grade: "11°", position: "consejo", number: 3 }
];

// --- Types ---
interface AdminEmail {
  email: string;
  enabled: boolean;
}

interface Config {
  census: number;
  adminPin?: string;
  sessionStatus: 'waiting' | 'active' | 'ended';
  sessionStart?: any;
  sessionEnd?: any;
  institutionName?: string;
  electionYear?: string;
  blancoVotes?: { [position: string]: number };
  initialSnapshot?: {
    totalVotes: number;
    voterCount: number;
    mesas: { [id: string]: number };
  };
  finalSnapshot?: {
    totalVotes: number;
    voterCount: number;
    mesas: { [id: string]: number };
  };
}
interface Candidate {
  id: string;
  name: string;
  photoUrl?: string;
  position: 'personeria' | 'contraloria' | 'consejo';
  grade?: string;
  number: number;
  voteCount?: number;
}

interface Voter {
  id: string;
  name: string;
  grade: string;
  hasVoted: boolean;
}

interface Mesa {
  id: string;
  name: string;
  grade: string;
  pin: string;
  voterCount?: number;
  createdAt?: any;
}

interface VoteRecord {
  id: string;
  candidateId: string;
  position: string;
  grade: string;
  mesaId?: string;
  mesaName?: string;
  timestamp: any;
  voterId: string;
}

// --- Online Status Component ---
const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg transition-all duration-500 ${
        isOnline 
          ? 'bg-green-500/10 border-green-500/20 text-green-600' 
          : 'bg-red-500/10 border-red-500/20 text-red-600'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] font-black uppercase tracking-widest">
          {isOnline ? 'En Línea' : 'Modo Offline'}
        </span>
      </div>
    </div>
  );
};

// --- PWA Status Component ---
const PWAStatus = () => {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onRegistered(r) {
        console.log('SW Registered');
      },
      onRegisterError(error) {
        console.error('SW registration error', error);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onNeedRefresh() {
        setNeedRefresh(true);
      },
    });
    setUpdateSW(() => update);
  }, []);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      <AnimatePresence>
        {offlineReady && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 right-4 z-[100] bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
          >
            <Zap size={20} className="animate-pulse" />
            <span>¡Listo para usar sin internet!</span>
            <button onClick={close} className="ml-2 hover:opacity-70">✕</button>
          </motion.div>
        )}
        {needRefresh && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 right-4 z-[100] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[280px]"
          >
            <div className="flex items-center gap-3 font-bold">
              <Cloud size={20} />
              <span>Nueva versión disponible</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => updateSW && updateSW(true)}
                className="bg-white text-indigo-600 px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
              >
                Actualizar ahora
              </button>
              <button onClick={close} className="text-white/70 text-sm font-bold px-2">Cerrar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Small persistent indicator when offline ready */}
      {offlineReady && (
        <div className="fixed bottom-4 left-4 z-[40] bg-white/10 backdrop-blur-md text-white/40 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 pointer-events-none">
          <Zap size={10} />
          MODO OFFLINE ACTIVADO
        </div>
      )}
    </>
  );
};

// --- Components ---

const AdminDashboard = ({ onLogout, handleBulkLoad, handleClearAll, isBulkLoading }: { onLogout: () => void, handleBulkLoad: () => void, handleClearAll: () => void, isBulkLoading: boolean }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [config, setConfig] = useState<Config>({ census: 500, adminPin: MASTER_PIN, sessionStatus: 'waiting' });
  const [activeTab, setActiveTab] = useState<'candidates' | 'results' | 'mesas' | 'settings' | 'jornada'>('settings');
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({ position: 'personeria' });
  const [isAddingMesa, setIsAddingMesa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newMesa, setNewMesa] = useState<Partial<Mesa>>({ pin: '1234' });
  const [selectedMesaFilter, setSelectedMesaFilter] = useState<string>('all');
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Listeners optimized by tab
  useEffect(() => {
    let unsubCandidates: (() => void) | undefined;
    if (activeTab === 'candidates' || activeTab === 'results') {
      unsubCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
        setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
      }, (err) => {
        const info = handleFirestoreError(err, OperationType.GET, 'candidates', false);
        if (info.isQuota) {
          getDocsFromCache(collection(db, 'candidates')).then(snap => {
            setCandidates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
          }).catch(() => {});
        }
      });
    }
    return () => unsubCandidates?.();
  }, [activeTab]);

  useEffect(() => {
    let unsubMesas: (() => void) | undefined;
    if (activeTab === 'mesas' || activeTab === 'results' || activeTab === 'jornada') {
      unsubMesas = onSnapshot(collection(db, 'mesas'), (snapshot) => {
        setMesas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mesa)));
      }, (err) => {
        const info = handleFirestoreError(err, OperationType.GET, 'mesas', false);
        if (info.isQuota) {
          getDocsFromCache(collection(db, 'mesas')).then(snap => {
            setMesas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mesa)));
          }).catch(() => {});
        }
      });
    }
    return () => unsubMesas?.();
  }, [activeTab]);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Config;
        setConfig({
          ...data,
          sessionStatus: data.sessionStatus || 'waiting'
        });
      }
    }, (err) => {
      console.warn("Config listener error:", err);
      getDocFromCache(doc(db, 'config', 'general')).then(snap => {
        if (snap.exists()) {
          const data = snap.data() as Config;
          setConfig({ ...data, sessionStatus: data.sessionStatus || 'waiting' });
        }
      }).catch(() => {});
    });
    return unsubConfig;
  }, []);

  useEffect(() => {
    let unsubAdminEmails: (() => void) | undefined;
    if (activeTab === 'settings') {
      unsubAdminEmails = onSnapshot(collection(db, 'admin_emails'), (snapshot) => {
        setAdminEmails(snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() } as AdminEmail)));
      }, (err) => {
        const info = handleFirestoreError(err, OperationType.GET, 'admin_emails', false);
        if (info.isQuota) {
          getDocsFromCache(collection(db, 'admin_emails')).then(snap => {
            setAdminEmails(snap.docs.map(doc => ({ email: doc.id, ...doc.data() } as AdminEmail)));
          }).catch(() => {});
        }
      });
    }
    return () => unsubAdminEmails?.();
  }, [activeTab]);

  // Fetch votes only if needed (e.g., for detailed filtering)
  const fetchVotes = async () => {
    setIsVotesLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'votes'));
      setVotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoteRecord)));
      toast.success('Detalles de votación cargados.');
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'votes');
    } finally {
      setIsVotesLoading(false);
    }
  };

  const [isResetting, setIsResetting] = useState(false);
  const [isVotesLoading, setIsVotesLoading] = useState(false);
  const [mesaToDelete, setMesaToDelete] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingMesaId, setEditingMesaId] = useState<string | null>(null);

  const handleEditCandidateClick = (candidate: Candidate) => {
    setEditingCandidateId(candidate.id);
    setNewCandidate({
      name: candidate.name,
      position: candidate.position,
      number: candidate.number,
      grade: candidate.grade || '',
      photoUrl: candidate.photoUrl || ''
    });
    setIsAddingCandidate(true);
  };

  const handleUpdateConfig = async (newConfig: Partial<Config>) => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'general'), { ...config, ...newConfig });
      toast.success('Configuración actualizada correctamente.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/general');
    } finally {
      setIsSaving(false);
    }
  };

  const startSession = async () => {
    if (!window.confirm('¿Estás seguro de iniciar la jornada de votación? Se tomará un reporte inicial de la base de datos.')) return;
    
    const totalVoters = mesas.reduce((acc, m) => acc + (m.voterCount || 0), 0);
    const initialSnapshot = {
      totalVotes: totalVoters * 3,
      voterCount: totalVoters,
      mesas: mesas.reduce((acc, m) => ({ ...acc, [m.id]: m.voterCount || 0 }), {})
    };

    await handleUpdateConfig({
      sessionStatus: 'active',
      sessionStart: serverTimestamp(),
      initialSnapshot
    });
    toast.success('Jornada de votación iniciada.');
  };

  const endSession = async () => {
    if (!window.confirm('¿Estás seguro de finalizar la jornada de votación? Se tomará un reporte final y se bloquearán nuevos votos.')) return;

    const totalVoters = mesas.reduce((acc, m) => acc + (m.voterCount || 0), 0);
    const finalSnapshot = {
      totalVotes: totalVoters * 3,
      voterCount: totalVoters,
      mesas: mesas.reduce((acc, m) => ({ ...acc, [m.id]: m.voterCount || 0 }), {})
    };

    await handleUpdateConfig({
      sessionStatus: 'ended',
      sessionEnd: serverTimestamp(),
      finalSnapshot
    });
    toast.success('Jornada de votación finalizada.');
  };

  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      toast.error('Ingresa un correo válido.');
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'admin_emails', newAdminEmail.toLowerCase().trim()), {
        addedAt: serverTimestamp(),
        enabled: true
      });
      setNewAdminEmail('');
      toast.success('Administrador agregado.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'admin_emails');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAdminEmail = async (email: string, currentStatus: boolean) => {
    if (email === 'archivosmipc14@gmail.com') {
      toast.error('No se puede deshabilitar al administrador principal.');
      return;
    }
    try {
      await updateDoc(doc(db, 'admin_emails', email), {
        enabled: !currentStatus
      });
      toast.success(`Acceso ${!currentStatus ? 'permitido' : 'restringido'} para ${email}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'admin_emails');
    }
  };

  const handleRemoveAdminEmail = async (email: string) => {
    if (email === 'archivosmipc14@gmail.com') {
      toast.error('No se puede eliminar al administrador principal.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'admin_emails', email));
      toast.success('Administrador eliminado.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'admin_emails');
    }
  };

  const handleResetElection = async () => {
    setIsSaving(true);
    try {
      // Delete all votes
      const voteSnaps = await getDocs(collection(db, 'votes'));
      
      // We need to use multiple batches if there are more than 500 operations, 
      // but for a typical school election reset, one or a few batches is fine.
      // To be safe, we'll use a simple loop with batches of 500.
      let batch = writeBatch(db);
      let operationCount = 0;

      const commitBatch = async () => {
        if (operationCount > 0) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      };

      for (const d of voteSnaps.docs) {
        batch.delete(d.ref);
        operationCount++;
        if (operationCount >= 450) await commitBatch();
      }

      // Reset mesa counters
      for (const m of mesas) {
        batch.update(doc(db, 'mesas', m.id), { voterCount: 0 });
        operationCount++;
        if (operationCount >= 450) await commitBatch();
      }

      // Reset candidate counters
      for (const c of candidates) {
        batch.update(doc(db, 'candidates', c.id), { voteCount: 0 });
        operationCount++;
        if (operationCount >= 450) await commitBatch();
      }

      // Reset blanco votes in config
      batch.update(doc(db, 'config', 'general'), {
        'blancoVotes.personeria': 0,
        'blancoVotes.contraloria': 0,
        'blancoVotes.consejo': 0
      });
      operationCount++;

      await commitBatch();

      toast.success('Elección reiniciada correctamente. Todo está en cero.');
      setIsResetting(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'votes');
    } finally {
      setIsSaving(false);
    }
  };

  const generateResultsPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const instName = config.institutionName || 'INSTITUCIÓN EDUCATIVA VILLA MARGARITA';
    const year = config.electionYear || '2026';
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(instName, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text(`ACTA OFICIAL DE ESCRUTINIO - ELECCIONES ESCOLARES ${year}`, pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ciudad: Montería | Fecha de reporte: ${new Date().toLocaleString()}`, pageWidth / 2, 38, { align: 'center' });

    let currentY = 50;

    // Ensure we have the latest votes for the report
    toast.loading('Obteniendo datos actualizados para el reporte...');
    let latestVotes: VoteRecord[] = votes;
    try {
      const votesSnap = await getDocs(collection(db, 'votes'));
      latestVotes = votesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoteRecord));
    } catch (err) {
      console.error("Error fetching votes for PDF:", err);
      toast.error("No se pudieron obtener los votos detallados. El reporte podría estar incompleto.");
    }
    toast.dismiss();

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > 275) {
        doc.addPage();
        currentY = 20;
      }
    };

    const getWinner = (data: { name: string, votes: number }[]) => {
      if (data.length === 0 || data[0].votes === 0) return 'Sin registros de votación';
      if (data.length > 1 && data[0].votes === data[1].votes) return 'Situación de Empate';
      return `Candidato con mayor votación: ${data[0].name}`;
    };

    // PART 1: RESULTS BY MESA (DETAILED)
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTE I: RESULTADOS DETALLADOS POR MESA', 14, currentY);
    currentY += 10;

    const mesasToReport = selectedMesaFilter === 'all' 
      ? mesas.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      : mesas.filter(m => m.id === selectedMesaFilter);

    for (const mesa of mesasToReport) {
      checkPageBreak(80);
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text(`Mesa: ${mesa.name} (Grado: ${mesa.grade})`, 14, currentY);
      currentY += 8;

      const mesaVotes = latestVotes.filter(v => v.mesaId === mesa.id);

      // Tables for each position
      const positions: ('consejo' | 'contraloria' | 'personeria')[] = ['consejo', 'contraloria', 'personeria'];
      
      for (const pos of positions) {
        const posCandidates = candidates.filter(c => {
          if (pos === 'consejo') return c.position === 'consejo' && c.grade === mesa.grade;
          return c.position === pos;
        });

        const results = posCandidates.map(c => ({
          name: c.name,
          votes: mesaVotes.filter(v => v.candidateId === c.id).length
        }));
        results.push({ 
          name: 'Voto en Blanco', 
          votes: mesaVotes.filter(v => v.position === pos && v.candidateId === 'blanco').length 
        });
        results.sort((a, b) => b.votes - a.votes);

        const title = pos === 'consejo' ? `Consejo (${mesa.grade})` : pos.charAt(0).toUpperCase() + pos.slice(1);
        
        autoTable(doc, {
          startY: currentY,
          head: [[title, 'Votos']],
          body: results.map(r => [r.name, r.votes]),
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(getWinner(results), 14, currentY);
        currentY += 10;
        checkPageBreak(40);
      }
      currentY += 5;
    }

    // PART 2: RESULTS BY GRADE (SUMMED)
    if (selectedMesaFilter === 'all') {
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('PARTE II: RESULTADOS CONSOLIDADOS POR GRADO (CONSEJO)', 14, currentY);
      currentY += 10;

      const gradeTableData = [];
      for (const grade of GRADES) {
        const gradeCandidates = candidates.filter(c => c.position === 'consejo' && c.grade === grade);
        const gradeVotes = latestVotes.filter(v => v.position === 'consejo' && v.grade === grade);
        const results = gradeCandidates.map(c => ({
          name: c.name,
          votes: gradeVotes.filter(v => v.candidateId === c.id).length
        }));
        results.push({ name: 'Voto en Blanco', votes: gradeVotes.filter(v => v.candidateId === 'blanco').length });
        results.sort((a, b) => b.votes - a.votes);
        
        gradeTableData.push([`Grado ${grade}`, getWinner(results).replace('Candidato con mayor votación: ', ''), results[0]?.votes || 0]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Grado', 'Ganador', 'Votos']],
        body: gradeTableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // NEW SECTION: DETAILED GENERAL RESULTS FOR CONTRALORIA AND PERSONERIA
    checkPageBreak(60);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTE III: DETALLE DE VOTACIÓN GENERAL (CONTRALORÍA Y PERSONERÍA)', 14, currentY);
    currentY += 10;

    const generalPositions: ('contraloria' | 'personeria')[] = ['contraloria', 'personeria'];
    for (const pos of generalPositions) {
      const posCandidates = candidates.filter(c => c.position === pos);
      const results = posCandidates.map(c => ({
        name: c.name,
        votes: latestVotes.filter(v => v.candidateId === c.id).length
      }));
      results.push({ 
        name: 'Voto en Blanco', 
        votes: latestVotes.filter(v => v.position === pos && v.candidateId === 'blanco').length 
      });
      results.sort((a, b) => b.votes - a.votes);

      autoTable(doc, {
        startY: currentY,
        head: [[pos.charAt(0).toUpperCase() + pos.slice(1) + ' General', 'Votos Totales']],
        body: results.map(r => [r.name, r.votes]),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(getWinner(results), 14, currentY);
      currentY += 15;
      checkPageBreak(50);
    }

    // PART 4: SUMMARY INSTITUTIONAL
    checkPageBreak(60);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTE IV: RESUMEN DE RESULTADOS INSTITUCIONALES', 14, currentY);
    currentY += 10;

    const allConsejo = candidates.filter(c => c.position === 'consejo').map(c => ({
      name: `${c.name} (${c.grade})`,
      votes: c.voteCount || 0
    })).sort((a, b) => b.votes - a.votes);

    const allContra = candidates.filter(c => c.position === 'contraloria').map(c => ({
      name: c.name,
      votes: c.voteCount || 0
    }));
    allContra.push({ name: 'Voto en Blanco', votes: config.blancoVotes?.['contraloria'] || 0 });
    allContra.sort((a, b) => b.votes - a.votes);

    const allPers = candidates.filter(c => c.position === 'personeria').map(c => ({
      name: c.name,
      votes: c.voteCount || 0
    }));
    allPers.push({ name: 'Voto en Blanco', votes: config.blancoVotes?.['personeria'] || 0 });
    allPers.sort((a, b) => b.votes - a.votes);

    autoTable(doc, {
      startY: currentY,
      head: [['Posición', 'Mayor Votación Obtenida', 'Votos']],
      body: [
        ['Consejo (Mayor Votación)', allConsejo[0]?.name || 'N/A', allConsejo[0]?.votes || 0],
        ['Contraloría', getWinner(allContra).replace('Candidato con mayor votación: ', ''), allContra[0]?.votes || 0],
        ['Personería', getWinner(allPers).replace('Candidato con mayor votación: ', ''), allPers[0]?.votes || 0]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // PART 5: JORNADA REPORT
    checkPageBreak(120);
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE FINAL DE JORNADA ELECTORAL', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    
    const startTime = config.sessionStart ? new Date(config.sessionStart.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
    const endTime = config.sessionEnd ? new Date(config.sessionEnd.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
    const totalVoters = Math.round(latestVotes.length / 3);

    const formalReportText = [
      `En la ciudad de Montería, a los ${new Date().getDate()} días del mes de marzo de ${new Date().getFullYear()}, `,
      `se emite el presente reporte consolidado para la jornada electoral de la Institución Educativa Villa Margarita.`,
      '',
      `DATOS DE TRANSPARENCIA Y AUDITORÍA:`,
      `----------------------------------------------------------------------------------------------------`,
      `- HORA DE APERTURA: ${startTime}`,
      `  Estado Inicial: ${config.initialSnapshot?.voterCount || 0} votantes registrados | ${config.initialSnapshot?.totalVotes || 0} sufragios totales.`,
      '',
      `- HORA DE CIERRE: ${endTime}`,
      `  Estado Final: ${config.finalSnapshot?.voterCount || totalVoters} votantes registrados | ${config.finalSnapshot?.totalVotes || latestVotes.length} sufragios totales.`,
      `----------------------------------------------------------------------------------------------------`,
      '',
      `Se registró una participación total de ${totalVoters} estudiantes, `,
      `quienes ejercieron su derecho al voto en las ${stats.totalMesas} mesas habilitadas.`,
      `La totalidad de votos procesados por el sistema fue de ${latestVotes.length} sufragios.`,
      '',
      `El censo electoral reportado fue de ${config.census} estudiantes, lo que representa `,
      `un índice de participación del ${config.census > 0 ? Math.round((totalVoters / config.census) * 100) : 0}%.`,
      '',
      'Los resultados presentados en este documento han sido procesados y validados por el sistema ',
      'de votación electrónica institucional, garantizando la transparencia y veracidad de cada sufragio.',
      '',
      'Este reporte sirve como acta oficial de cierre de la jornada electoral.'
    ].join('\n');
    
    const splitReport = doc.splitTextToSize(formalReportText, pageWidth - 40);
    doc.text(splitReport, 20, currentY, { align: 'left', lineHeightFactor: 1.5 });
    
    doc.save(`Reporte_Elecciones_${instName.replace(/\s+/g, '_')}_${year}.pdf`);
    toast.success('Reporte oficial generado correctamente.');
  };

  const generateMesasPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const instName = config.institutionName || 'INSTITUCIÓN EDUCATIVA VILLA MARGARITA';
    const year = config.electionYear || '2026';
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(`${instName} - ELECCIONES ${year}`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text('REPORTE DE MESAS DE VOTACIÓN', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, pageWidth / 2, 38, { align: 'center' });

    const tableData = [...mesas]
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      .map(m => [m.name, m.grade, m.pin]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Nombre de la Mesa', 'Grado Asignado', 'PIN de Seguridad']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Mesas_${instName.replace(/\s+/g, '_')}_${year}.pdf`);
    toast.success('Reporte de Mesas PDF generado correctamente.');
  };
  const handleEditMesaClick = (mesa: Mesa) => {
    setEditingMesaId(mesa.id);
    setNewMesa({
      name: mesa.name,
      grade: mesa.grade,
      pin: mesa.pin
    });
    setIsAddingMesa(true);
  };

  const handleSaveMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMesa.name || !newMesa.grade || !newMesa.pin || isSaving) return;
    
    // Check for duplicate mesa name in the same grade
    const duplicate = mesas.find(m => 
      m.id !== editingMesaId &&
      m.name.toLowerCase().trim() === newMesa.name?.toLowerCase().trim() && 
      m.grade === newMesa.grade
    );
    
    if (duplicate) {
      toast.error(`Ya existe una mesa llamada "${newMesa.name}" para el grado ${newMesa.grade}`);
      return;
    }

    setIsSaving(true);
    try {
      if (editingMesaId) {
        await updateDoc(doc(db, 'mesas', editingMesaId), {
          name: newMesa.name,
          grade: newMesa.grade,
          pin: newMesa.pin
        });
        toast.success('Mesa actualizada correctamente.');
      } else {
        await addDoc(collection(db, 'mesas'), { 
          ...newMesa, 
          voterCount: 0,
          createdAt: serverTimestamp()
        });
        toast.success('Mesa agregada correctamente.');
      }
      setNewMesa({ pin: '1234' });
      setIsAddingMesa(false);
      setEditingMesaId(null);
    } catch (err) {
      handleFirestoreError(err, editingMesaId ? OperationType.UPDATE : OperationType.CREATE, 'mesas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMesa = async () => {
    if (!mesaToDelete) return;
    try {
      await deleteDoc(doc(db, 'mesas', mesaToDelete));
      setMesaToDelete(null);
      toast.success('Mesa eliminada correctamente.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'mesas');
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.number || isSaving) return;
    setIsSaving(true);
    try {
      if (editingCandidateId) {
        await updateDoc(doc(db, 'candidates', editingCandidateId), {
          ...newCandidate,
          number: Number(newCandidate.number)
        });
        toast.success('Candidato actualizado correctamente.');
      } else {
        await addDoc(collection(db, 'candidates'), {
          ...newCandidate,
          number: Number(newCandidate.number)
        });
        toast.success('Candidato agregado correctamente.');
      }
      setNewCandidate({ position: 'personeria' });
      setEditingCandidateId(null);
      setIsAddingCandidate(false);
    } catch (err) {
      handleFirestoreError(err, editingCandidateId ? OperationType.UPDATE : OperationType.CREATE, 'candidates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteDoc(doc(db, 'candidates', candidateToDelete));
      setCandidateToDelete(null);
      toast.success('Candidato eliminado correctamente.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'candidates');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for Firestore document size safety
        toast.error('La imagen es muy pesada. Máximo 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCandidate({ ...newCandidate, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const stats = useMemo(() => {
    const totalVoters = mesas.reduce((sum, m) => sum + (m.voterCount || 0), 0);
    const totalVotes = totalVoters * 3; 
    const uniqueVoters = totalVoters;
    const totalMesas = mesas.length;
    const totalCandidates = candidates.length;
    
    // Participation by Mesa
    const mesaParticipation = mesas.map(m => ({
      name: m.name,
      count: m.voterCount || 0
    }));

    // Votes by Grade
    const gradeStats = GRADES.map(g => ({
      name: g,
      count: mesas.filter(m => m.grade === g).reduce((sum, m) => sum + (m.voterCount || 0), 0)
    }));

    return { totalVotes, uniqueVoters, totalMesas, totalCandidates, mesaParticipation, gradeStats };
  }, [mesas, candidates]);

  const resultsData = useMemo(() => {
    const positions = ['personeria', 'contraloria', 'consejo'];
    
    // If we have a mesa filter and votes are loaded, use them
    if (selectedMesaFilter !== 'all' && votes.length > 0) {
      const filteredVotes = votes.filter(v => v.mesaId === selectedMesaFilter);
      return positions.map(pos => {
        const posCandidates = candidates.filter(c => c.position === pos);
        const data = posCandidates.map(c => ({
          name: c.name,
          votes: filteredVotes.filter(v => v.candidateId === c.id).length,
          grade: c.grade
        }));
        const blancoVotes = filteredVotes.filter(v => v.candidateId === 'blanco' && v.position === pos).length;
        data.push({ name: 'Voto en Blanco', votes: blancoVotes, grade: '' });
        return { position: pos, data: data.sort((a, b) => b.votes - a.votes) };
      });
    }

    // Otherwise use aggregated counts (global results)
    return positions.map(pos => {
      const posCandidates = candidates.filter(c => c.position === pos);
      const data = posCandidates.map(c => ({
        name: c.name,
        votes: c.voteCount || 0,
        grade: c.grade
      }));
      
      const blancoVotes = config.blancoVotes?.[pos] || 0;
      data.push({ name: 'Voto en Blanco', votes: blancoVotes, grade: '' });
      
      return { position: pos, data: data.sort((a, b) => b.votes - a.votes) };
    });
  }, [candidates, config, votes, selectedMesaFilter]);

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const posOrder = { consejo: 1, contraloria: 2, personeria: 3 };
      const posA = posOrder[a.position] || 99;
      const posB = posOrder[b.position] || 99;
      if (posA !== posB) return posA - posB;

      const gradeA = GRADES.indexOf(a.grade || '');
      const gradeB = GRADES.indexOf(b.grade || '');
      if (gradeA !== gradeB) return gradeA - gradeB;

      return a.name.localeCompare(b.name);
    });
  }, [candidates]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white flex-shrink-0">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 line-clamp-1">{config.institutionName || 'Villa Margarita'}</h1>
            <p className="text-slate-500 text-sm">Panel de Administración Electoral {config.electionYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => window.location.hash = ''}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap text-sm"
          >
            <HomeIcon size={18} />
            Inicio
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap text-sm"
          >
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </header>

      <nav className="flex overflow-x-auto gap-1 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-full no-scrollbar">
        <button 
          onClick={() => setActiveTab('results')}
          className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'results' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Resultados
        </button>
        <button 
          onClick={() => setActiveTab('jornada')}
          className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'jornada' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Jornada
        </button>
        <button 
          onClick={() => setActiveTab('candidates')}
          className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'candidates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Candidatos
        </button>
        <button 
          onClick={() => setActiveTab('mesas')}
          className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'mesas' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Mesas
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Ajustes
        </button>
      </nav>

      <main>
        {activeTab === 'results' && (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Estudiantes</p>
                <h4 className="text-3xl font-black text-slate-900">{Math.round(stats.totalVotes / 3)}</h4>
                <div className="mt-2 text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded w-fit">
                  {stats.totalVotes} Votos Totales
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-1">Candidatos</p>
                <h4 className="text-3xl font-black text-slate-900">{stats.totalCandidates}</h4>
                <div className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded w-fit">
                  Activos
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-1">Mesas</p>
                <h4 className="text-3xl font-black text-slate-900">{stats.totalMesas}</h4>
                <div className="mt-2 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded w-fit">
                  Configuradas
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-1">Participación</p>
                <h4 className="text-3xl font-black text-slate-900">
                  {config.census > 0 ? Math.round((Math.round(stats.totalVotes / 3) / config.census) * 100) : 0}%
                </h4>
                <div className="mt-2 text-xs text-slate-400 font-medium">
                  Censo: {config.census} estudiantes
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-700">Filtrar por Mesa:</span>
                <select 
                  value={selectedMesaFilter}
                  onChange={e => setSelectedMesaFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todas las Mesas</option>
                  {mesas.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.grade})</option>
                  ))}
                </select>
                {selectedMesaFilter !== 'all' && votes.length === 0 && (
                  <button 
                    onClick={fetchVotes}
                    disabled={isVotesLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-bold disabled:opacity-50"
                  >
                    {isVotesLoading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Users size={14} />}
                    {isVotesLoading ? 'Cargando...' : 'Cargar Detalle'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={generateResultsPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-bold"
                >
                  <BarChart3 size={16} />
                  Exportar PDF
                </button>
                <div className="text-xs font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  Última actualización: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            {/* Main Results Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {resultsData.map(section => (
                <div key={section.position} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 capitalize flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BarChart3 size={20} className="text-indigo-600" />
                      {section.position}
                    </span>
                    <span className="text-xs font-medium text-slate-400 uppercase">
                      Total: {section.data.reduce((acc, curr) => acc + curr.votes, 0)} votos
                    </span>
                  </h3>
                  <div className="h-[300px] w-full relative flex items-center justify-center overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
                      <BarChart data={section.data} layout="vertical" margin={{ left: 40, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={100} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={20}>
                          {section.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#94a3b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Winner Card */}
                  {section.data.length > 0 && section.data[0].votes > 0 && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                          <Trophy size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Líder Actual</p>
                          <h5 className="font-bold text-indigo-900">{section.data[0].name}</h5>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-indigo-600">{section.data[0].votes}</p>
                        <p className="text-[10px] text-indigo-400">Votos</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Secondary Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Users size={20} className="text-indigo-600" />
                  Participación por Grado
                </h3>
                <div className="h-[300px] w-full relative min-h-[300px] flex items-center justify-center overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
                    <BarChart data={stats.gradeStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <School size={20} className="text-indigo-600" />
                  Actividad por Mesa
                </h3>
                <div className="h-[300px] w-full relative min-h-[300px] flex items-center justify-center overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
                    <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Pie
                        data={stats.mesaParticipation}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {stats.mesaParticipation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jornada' && (
          <div className="max-w-4xl space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                  config.sessionStatus === 'active' ? 'bg-green-100 text-green-600' : 
                  config.sessionStatus === 'ended' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">Control de Jornada Electoral</h2>
                  <p className="text-sm sm:text-base text-slate-500">Administra el inicio y fin de las votaciones</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estado Actual</p>
                  <p className={`text-xl font-black ${
                    config.sessionStatus === 'active' ? 'text-green-600' : 
                    config.sessionStatus === 'ended' ? 'text-red-600' : 'text-slate-600'
                  }`}>
                    {config.sessionStatus === 'active' ? 'EN PROGRESO' : 
                     config.sessionStatus === 'ended' ? 'FINALIZADA' : 'EN ESPERA'}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Inicio</p>
                  <p className="text-xl font-black text-slate-900">
                    {config.sessionStart ? new Date(config.sessionStart.seconds * 1000).toLocaleTimeString() : '--:--'}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fin</p>
                  <p className="text-xl font-black text-slate-900">
                    {config.sessionEnd ? new Date(config.sessionEnd.seconds * 1000).toLocaleTimeString() : '--:--'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {config.sessionStatus === 'waiting' && (
                  <button 
                    onClick={startSession}
                    className="flex-1 min-w-[200px] py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3"
                  >
                    <Zap size={20} />
                    Iniciar Jornada
                  </button>
                )}
                {config.sessionStatus === 'active' && (
                  <button 
                    onClick={endSession}
                    className="flex-1 min-w-[200px] py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-3"
                  >
                    <LogOut size={20} />
                    Finalizar Jornada
                  </button>
                )}
                {(config.sessionStatus === 'ended' || config.sessionStatus === 'active') && (
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de resetear la jornada? Esto borrará los tiempos y snapshots (pero NO los votos).')) {
                        handleUpdateConfig({
                          sessionStatus: 'waiting',
                          sessionStart: null,
                          sessionEnd: null,
                          initialSnapshot: null,
                          finalSnapshot: null
                        });
                      }
                    }}
                    className="flex-1 min-w-[200px] py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                  >
                    <RotateCcw size={20} />
                    Resetear Jornada
                  </button>
                )}
              </div>
            </div>

            <div className="bg-indigo-50 p-6 md:p-8 rounded-3xl border border-indigo-100">
              <h3 className="text-lg font-bold text-indigo-900 mb-6 flex items-center gap-2">
                <Info size={20} />
                Información de Auditoría
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {config.initialSnapshot && (
                  <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Snapshot Inicial (Apertura)</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Votantes:</span>
                        <span className="font-bold text-slate-900">{config.initialSnapshot.voterCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Votos:</span>
                        <span className="font-bold text-slate-900">{config.initialSnapshot.totalVotes || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {config.finalSnapshot && (
                  <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Snapshot Final (Cierre)</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Votantes:</span>
                        <span className="font-bold text-slate-900">{config.finalSnapshot.voterCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Votos:</span>
                        <span className="font-bold text-slate-900">{config.finalSnapshot.totalVotes || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4 text-sm text-indigo-700">
                <p>• Al <b>Iniciar</b>, se guarda un "Snapshot" con el total de votos actual y el estado de cada mesa.</p>
                <p>• Al <b>Finalizar</b>, se bloquean las mesas de votación y se guarda el "Snapshot" final.</p>
                <p>• Estos datos aparecerán en el reporte PDF final para garantizar la transparencia del proceso.</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Gestión de Candidatos</h2>
              <button 
                onClick={() => {
                  setEditingCandidateId(null);
                  setNewCandidate({ position: 'personeria' });
                  setIsAddingCandidate(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Nuevo Candidato
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCandidates.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl overflow-hidden">
                      {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : c.number}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{c.name}</h4>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        {c.position} {c.grade ? `• Grado ${c.grade}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleEditCandidateClick(c)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setCandidateToDelete(c.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'mesas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Gestión de Mesas</h2>
              <button 
                onClick={() => {
                  setEditingMesaId(null);
                  setNewMesa({ pin: '1234' });
                  setIsAddingMesa(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Nueva Mesa
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...mesas].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)).map(m => (
                <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                      <School size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{m.name}</h4>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        Grado: {m.grade} • PIN: {m.pin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleEditMesaClick(m)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setMesaToDelete(m.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Settings size={24} className="text-indigo-600" />
                Configuración General
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de la Institución</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={config.institutionName || ''}
                      onChange={e => setConfig({ ...config, institutionName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Año de Elección</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={config.electionYear || ''}
                      onChange={e => setConfig({ ...config, electionYear: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Censo Electoral (Total Estudiantes)</label>
                  <div className="flex gap-4">
                    <input 
                      type="number" 
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={config.census}
                      onChange={e => setConfig({ ...config, census: Number(e.target.value) })}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Este número se usa para calcular el porcentaje de participación.</p>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => handleUpdateConfig({ 
                      census: config.census,
                      institutionName: config.institutionName,
                      electionYear: config.electionYear
                    })}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
                  >
                    Guardar Configuración
                  </button>
                </div>
                
                <div className="pt-6 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Administradores Autorizados</label>
                  <p className="text-xs text-slate-500 mb-4">Agrega los correos de Google que tendrán acceso a este panel.</p>
                  
                  <form onSubmit={handleAddAdminEmail} className="flex gap-4 mb-4">
                    <input 
                      type="email" 
                      placeholder="correo@ejemplo.com"
                      required
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Agregar
                    </button>
                  </form>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {/* Default Admin */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-700">archivosmipc14@gmail.com</span>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-100 px-2 py-1 rounded-md">Principal</span>
                    </div>
                    {/* Other Admins */}
                    {adminEmails.filter(a => a.email !== 'archivosmipc14@gmail.com').map(admin => (
                      <div key={admin.email} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700">{admin.email}</span>
                          <span className={`text-[10px] font-bold uppercase ${admin.enabled ? 'text-green-500' : 'text-red-500'}`}>
                            {admin.enabled ? 'Acceso Permitido' : 'Acceso Denegado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAdminEmail(admin.email, admin.enabled)}
                            className={`p-1.5 rounded-md transition-colors ${admin.enabled ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                            title={admin.enabled ? 'Deshabilitar acceso' : 'Habilitar acceso'}
                          >
                            {admin.enabled ? <CloudOff size={16} /> : <Cloud size={16} />}
                          </button>
                          <button
                            onClick={() => handleRemoveAdminEmail(admin.email)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar administrador"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 text-red-600">
                <ShieldCheck size={24} />
                Acciones Administrativas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleBulkLoad}
                  disabled={isBulkLoading}
                  className="flex items-center justify-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-bold disabled:opacity-50"
                >
                  <Database size={20} />
                  Carga Masiva (Villa Margarita)
                </button>
                <button 
                  onClick={generateResultsPDF}
                  className="flex items-center justify-center gap-3 p-4 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-bold"
                >
                  <BarChart3 size={20} />
                  Generar Reporte Resultados
                </button>
                <button 
                  onClick={generateMesasPDF}
                  className="flex items-center justify-center gap-3 p-4 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-bold"
                >
                  <School size={20} />
                  Generar Reporte Mesas
                </button>
                <button 
                  onClick={handleClearAll}
                  disabled={isBulkLoading}
                  className="flex items-center justify-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all font-bold disabled:opacity-50"
                >
                  <RotateCcw size={20} />
                  Reiniciar Votos (Nueva Elección)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Mesa Modal */}
      <AnimatePresence>
        {isAddingMesa && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">{editingMesaId ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
              <form onSubmit={handleSaveMesa} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Mesa</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: Mesa 1"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newMesa.name || ''}
                    onChange={e => setNewMesa({ ...newMesa, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grado Asignado</label>
                  <select 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newMesa.grade || ''}
                    onChange={e => setNewMesa({ ...newMesa, grade: e.target.value })}
                  >
                    <option value="">Seleccionar Grado</option>
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PIN de Seguridad (4-6 dígitos)</label>
                  <input 
                    type="password" 
                    required 
                    maxLength={6}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newMesa.pin || ''}
                    onChange={e => setNewMesa({ ...newMesa, pin: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingMesa(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg transition-colors shadow-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {candidateToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Candidato?</h3>
              <p className="text-slate-500 mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCandidateToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteCandidate}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Candidate Modal */}
      <AnimatePresence>
        {isAddingCandidate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                {editingCandidateId ? 'Editar Candidato' : 'Nuevo Candidato'}
              </h3>
              <form onSubmit={handleSaveCandidate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newCandidate.name || ''}
                    onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Posición</label>
                    <select 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newCandidate.position}
                      onChange={e => setNewCandidate({ ...newCandidate, position: e.target.value as any })}
                    >
                      <option value="personeria">Personería</option>
                      <option value="contraloria">Contraloría</option>
                      <option value="consejo">Consejo Estudiantil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                    <input 
                      type="number" 
                      required 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newCandidate.number || ''}
                      onChange={e => setNewCandidate({ ...newCandidate, number: Number(e.target.value) })}
                    />
                  </div>
                </div>
                {newCandidate.position === 'consejo' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grado</label>
                    <select 
                      required
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newCandidate.grade || ''}
                      onChange={e => setNewCandidate({ ...newCandidate, grade: e.target.value })}
                    >
                      <option value="">Seleccionar Grado</option>
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Foto del Candidato</label>
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200"></div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">O URL de Google Drive</span>
                      <div className="h-px flex-1 bg-slate-200"></div>
                    </div>
                    <input 
                      type="url" 
                      placeholder="Pegar enlace directo o de Drive"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={newCandidate.photoUrl || ''}
                      onChange={e => setNewCandidate({ ...newCandidate, photoUrl: e.target.value })}
                    />
                    {newCandidate.photoUrl && (
                      <div className="mt-2 flex justify-center">
                        <img src={newCandidate.photoUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingCandidate(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg transition-colors shadow-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Reiniciar Elección?</h3>
              <p className="text-slate-500 mb-6">Esta acción ELIMINARÁ TODOS LOS VOTOS y reiniciará los contadores. No se puede deshacer.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsResetting(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleResetElection}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Reiniciando...' : 'Reiniciar Todo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Mesa Confirmation Modal */}
      <AnimatePresence>
        {mesaToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Mesa?</h3>
              <p className="text-slate-500 mb-6">¿Estás seguro de que deseas eliminar esta mesa de votación?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setMesaToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteMesa}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

const StudentVoting = ({ config: initialConfig }: { config: Config }) => {
  const [step, setStep] = useState<'setup' | 'start' | 'consejo' | 'contraloria' | 'personeria' | 'success'>('setup');
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [config, setConfig] = useState<Config>(initialConfig);
  const [selections, setSelections] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [isResettingMesa, setIsResettingMesa] = useState(false);
  const [resetPin, setResetPin] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      // Try loading from localStorage first for instant UI
      const cachedCandidates = localStorage.getItem('villa_margarita_candidates');
      const cachedMesas = localStorage.getItem('villa_margarita_mesas');
      const cachedConfig = localStorage.getItem('villa_margarita_config');
      
      if (cachedCandidates) setCandidates(JSON.parse(cachedCandidates));
      if (cachedMesas) setMesas(JSON.parse(cachedMesas));
      if (cachedConfig) setConfig(JSON.parse(cachedConfig));

      try {
        // Single read from server instead of real-time listener for voting view
        const candidatesSnap = await getDocs(collection(db, 'candidates'));
        const cData = candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
        setCandidates(cData);
        localStorage.setItem('villa_margarita_candidates', JSON.stringify(cData));
        
        const mesasSnap = await getDocs(collection(db, 'mesas'));
        const mData = mesasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mesa));
        setMesas(mData);
        localStorage.setItem('villa_margarita_mesas', JSON.stringify(mData));

        const configSnap = await getDoc(doc(db, 'config', 'general'));
        if (configSnap.exists()) {
          const conf = { ...configSnap.data() } as Config;
          setConfig(conf);
          localStorage.setItem('villa_margarita_config', JSON.stringify(conf));
        }
      } catch (err) {
        const info = handleFirestoreError(err, OperationType.GET, 'initial_data', false);
        if (info.isQuota) {
          try {
            const cSnap = await getDocsFromCache(collection(db, 'candidates'));
            setCandidates(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
            const mSnap = await getDocsFromCache(collection(db, 'mesas'));
            setMesas(mSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mesa)));
          } catch (cacheErr) {
            throw new Error(JSON.stringify(info));
          }
        } else {
          throw new Error(JSON.stringify(info));
        }
      }
    };

    loadInitialData();

    // Check localStorage for saved mesa
    const savedMesaId = localStorage.getItem('villa_margarita_mesa_id');
    if (savedMesaId) {
      getDoc(doc(db, 'mesas', savedMesaId))
        .then(snap => {
          if (snap.exists()) {
            setSelectedMesa({ id: snap.id, ...snap.data() } as Mesa);
            setStep('start');
          } else {
            localStorage.removeItem('villa_margarita_mesa_id');
            setStep('setup');
          }
        })
        .catch(async err => {
          console.error("Error loading saved mesa:", err);
          // Try cache fallback
          try {
            const snap = await getDocFromCache(doc(db, 'mesas', savedMesaId));
            if (snap.exists()) {
              setSelectedMesa({ id: snap.id, ...snap.data() } as Mesa);
              setStep('start');
            } else {
              setStep('setup');
            }
          } catch (e) {
            setStep('setup');
          }
        });
    } else {
      setStep('setup');
    }

    return () => {
      // No listeners to unsubscribe from
    };
  }, []);

  useEffect(() => {
    if (step === 'success') {
      setCooldown(10);
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setStep('start');
            setSelections({});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const handleSetup = (mesa: Mesa) => {
    if (setupPin === mesa.pin) {
      setSelectedMesa(mesa);
      localStorage.setItem('villa_margarita_mesa_id', mesa.id);
      setStep('start');
      setSetupPin('');
      setError('');
      toast.success('Mesa configurada correctamente.');
    } else {
      setError('PIN incorrecto para esta mesa.');
      toast.error('PIN incorrecto para esta mesa.');
    }
  };

  const handleReset = () => {
    if (resetPin === selectedMesa?.pin) {
      localStorage.removeItem('villa_margarita_mesa_id');
      setSelectedMesa(null);
      setStep('setup');
      setIsResettingMesa(false);
      setResetPin('');
      toast.success('Mesa reseteada correctamente.');
    } else {
      toast.error('PIN incorrecto.');
    }
  };

  const handleVote = (candidateId: string, position: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    toast.info('Escogido correctamente. Cargando...', { 
      duration: 1000,
      icon: '✅'
    });

    const newSelections = { ...selections, [position]: candidateId };
    setSelections(newSelections);

    // Small artificial delay to ensure the user sees the feedback and prevent rapid clicks
    setTimeout(() => {
      if (position === 'consejo') {
        setStep('contraloria');
        setIsProcessing(false);
      } else if (position === 'contraloria') {
        setStep('personeria');
        setIsProcessing(false);
      } else {
        submitVotes(newSelections);
      }
    }, 1200); // Slightly longer delay to be safe
  };

  const submitVotes = async (finalSelections: { [key: string]: string }) => {
    if (!selectedMesa) return;
    try {
      const batch = writeBatch(db);
      const voterId = 'anonymous_' + Date.now();

      Object.entries(finalSelections).forEach(([pos, candId]) => {
        // 1. Record the individual vote (for auditing)
        const voteRef = doc(collection(db, 'votes'));
        batch.set(voteRef, {
          candidateId: candId,
          position: pos,
          grade: selectedMesa.grade,
          mesaId: selectedMesa.id,
          mesaName: selectedMesa.name,
          timestamp: serverTimestamp(),
          voterId: voterId
        });

        // 2. Increment aggregated counts
        if (candId === 'blanco') {
          batch.update(doc(db, 'config', 'general'), {
            [`blancoVotes.${pos}`]: increment(1)
          });
        } else {
          batch.update(doc(db, 'candidates', candId), {
            voteCount: increment(1)
          });
        }
      });
      
      // Increment voter count for the mesa
      batch.update(doc(db, 'mesas', selectedMesa.id), {
        voterCount: increment(1)
      });

      await batch.commit();

      setStep('success');
      toast.success('¡Votos registrados correctamente!');
    } catch (err) {
      setError('Error al registrar los votos.');
      toast.error('Error al registrar los votos.');
      handleFirestoreError(err, OperationType.CREATE, 'votes');
    } finally {
      setIsProcessing(false);
    }
  };

  if (config.sessionStatus !== 'active' && step !== 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md bg-white p-12 rounded-3xl shadow-2xl">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            config.sessionStatus === 'ended' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
          }`}>
            {config.sessionStatus === 'ended' ? <LogOut size={40} /> : <Settings size={40} />}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {config.sessionStatus === 'ended' ? 'Votación Finalizada' : 'Votación no Iniciada'}
          </h1>
          <p className="text-slate-600 mb-8">
            {config.sessionStatus === 'ended' 
              ? 'La jornada electoral ha concluido. Gracias por participar.' 
              : 'La jornada electoral aún no ha comenzado. Por favor, espera instrucciones del moderador.'}
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.hash = ''}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <HomeIcon size={20} />
              Volver al Inicio
            </button>
            <button 
              onDoubleClick={() => setIsResettingMesa(true)}
              className="text-slate-300 hover:text-slate-500 transition-colors text-xs py-2"
            >
              Configurar Mesa
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'setup') {
    const sortedMesas = [...mesas].sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeA - timeB;
    });

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-4xl text-center flex flex-col max-h-[90vh]">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shrink-0">
            <Settings className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1 md:mb-2 shrink-0">Configuración de Mesa</h1>
          <p className="text-slate-500 mb-6 md:mb-8 text-sm md:text-base shrink-0">Selecciona la mesa asignada a este dispositivo</p>
          
          <div className="space-y-4 md:space-y-6 flex-1 overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 max-w-xs mx-auto shrink-0 w-full">
              <input 
                type="password" 
                placeholder="PIN de Seguridad"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold w-full"
                value={setupPin}
                onChange={e => setSetupPin(e.target.value)}
              />
              <button 
                onClick={() => window.location.hash = ''}
                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <HomeIcon size={18} />
                <span className="sm:hidden">Volver al Inicio</span>
              </button>
            </div>
            {error && <p className="text-red-500 text-sm font-medium mt-2 shrink-0">{error}</p>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[200px] pb-4">
              {sortedMesas.map(m => (
                <button 
                  key={m.id}
                  onClick={() => handleSetup(m)}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left flex justify-between items-center group"
                >
                  <div>
                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{m.name}</span>
                    <p className="text-xs text-slate-500">Grado: {m.grade}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'start') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4 relative">
        <button 
          onClick={() => setIsResettingMesa(true)}
          className="absolute top-4 left-4 md:top-8 md:left-8 text-white/20 hover:text-white/50 transition-colors"
          title="Resetear Mesa"
        >
          <School className="w-8 h-8 md:w-10 md:h-10" />
        </button>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-xl text-center">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8">
            <Vote className="w-8 h-8 md:w-12 md:h-12" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 md:mb-4">Villa Margarita</h1>
          <div className="bg-indigo-50 px-4 py-2 md:px-6 md:py-3 rounded-2xl inline-block mb-8 md:mb-12">
            <p className="text-indigo-700 font-bold text-base md:text-lg">
              {selectedMesa?.name} • Grado {selectedMesa?.grade}
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setStep('consejo')}
              className="w-full py-4 md:py-6 bg-indigo-600 text-white rounded-2xl font-black text-xl md:text-2xl hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-3 md:gap-4"
            >
              Comenzar a Votar
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setStep('setup')}
                className="flex-1 py-3 md:py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <ArrowLeft size={18} />
                Cambiar Mesa
              </button>
              <button 
                onClick={() => window.location.hash = ''}
                className="flex-1 py-3 md:py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <HomeIcon size={18} />
                Inicio
              </button>
            </div>
          </div>
          
          <p className="mt-4 md:mt-6 text-slate-400 text-xs md:text-sm">Moderador presente en mesa para asistencia</p>
        </motion.div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-500 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <CheckCircle2 className="w-8 h-8 md:w-14 md:h-14" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 md:mb-4">¡Voto Registrado!</h1>
          <p className="text-slate-600 mb-6 md:mb-8 text-base md:text-lg">Gracias por participar. Por favor, retírate de la mesa.</p>
          
          <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-slate-100 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
              <motion.circle className="text-green-500 stroke-current" strokeWidth="10" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" initial={{ pathLength: 1 }} animate={{ pathLength: 0 }} transition={{ duration: 10, ease: "linear" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-xl md:text-2xl text-slate-900">{cooldown}</div>
          </div>
          <p className="text-slate-400 text-xs md:text-sm">Siguiente estudiante en {cooldown} segundos...</p>
        </motion.div>
      </div>
    );
  }

  const currentPosition = step as 'personeria' | 'contraloria' | 'consejo';
  const filteredCandidates = candidates
    .filter(c => {
      if (currentPosition === 'consejo') {
        return c.position === 'consejo' && c.grade === selectedMesa?.grade;
      }
      return c.position === currentPosition;
    })
    .sort((a, b) => a.number - b.number);

  const getStepNumber = () => {
    if (step === 'consejo') return 1;
    if (step === 'contraloria') return 2;
    if (step === 'personeria') return 3;
    return 1;
  };

  const getTotalSteps = () => {
    return 3;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="mb-8 md:mb-12 text-center">
          <div className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
            Paso {getStepNumber()} de {getTotalSteps()}
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 capitalize mb-2">
            Votación para {currentPosition}
          </h2>
          <p className="text-slate-500 text-sm md:text-base">Selecciona a tu candidato preferido de la lista</p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
          {filteredCandidates.map(c => (
            <motion.button
              key={c.id}
              disabled={isProcessing}
              whileHover={!isProcessing ? { y: -5 } : {}}
              whileTap={!isProcessing ? { scale: 0.98 } : {}}
              onClick={() => handleVote(c.id, currentPosition)}
              className={`bg-white rounded-2xl overflow-hidden shadow-md border-2 border-transparent transition-all text-left group flex flex-col ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-600'}`}
            >
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <UserIcon className="w-12 h-12 md:w-16 md:h-16" />
                  </div>
                )}
                <div className="absolute top-2 right-2 w-8 h-8 md:w-10 md:h-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center font-black text-lg md:text-xl text-indigo-600">
                  {c.number}
                </div>
              </div>
              <div className="p-3 md:p-6 flex-1 flex flex-col justify-center">
                <h3 className={`text-sm md:text-lg font-bold text-slate-900 leading-tight transition-colors line-clamp-2 ${!isProcessing && 'group-hover:text-indigo-600'}`}>{c.name}</h3>
                <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-2">Candidato #{c.number}</p>
              </div>
            </motion.button>
          ))}
          
          {/* Voto en Blanco */}
          <motion.button
            disabled={isProcessing}
            whileHover={!isProcessing ? { y: -5 } : {}}
            whileTap={!isProcessing ? { scale: 0.98 } : {}}
            onClick={() => handleVote('blanco', currentPosition)}
            className={`bg-white rounded-2xl overflow-hidden shadow-md border-2 border-transparent transition-all text-left flex flex-col items-center justify-center p-4 md:p-8 min-h-[150px] md:min-h-[200px] ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400'}`}
          >
            <div className="w-10 h-10 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2 md:mb-4">
              <Plus className="w-6 h-6 md:w-8 md:h-8 rotate-45" />
            </div>
            <h3 className="text-sm md:text-lg font-bold text-slate-900 text-center">Voto en Blanco</h3>
            <p className="text-slate-500 text-xs md:text-sm text-center mt-1 md:mt-2">Ninguno</p>
          </motion.button>
        </div>
      </div>

      {/* Reset Mesa Confirmation Modal */}
      <AnimatePresence>
        {isResettingMesa && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Resetear Dispositivo</h3>
              <p className="text-slate-500 mb-6">Ingresa el PIN de la mesa para volver a la configuración inicial.</p>
              
              <input 
                type="password" 
                placeholder="PIN de Mesa"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold mb-4"
                value={resetPin}
                onChange={e => setResetPin(e.target.value)}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsResettingMesa(false);
                    setResetPin('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ha ocurrido un error inesperado.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.isQuota) {
          errorMessage = "Se ha agotado la cuota gratuita de lectura de la base de datos por hoy. El sistema volverá a estar disponible mañana.";
        } else if (parsed.error && (parsed.error.includes("insufficient permissions") || parsed.error.includes("permission-denied"))) {
          errorMessage = "No tienes permisos suficientes para realizar esta acción o ver estos datos.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Ups! Algo salió mal</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isAdminChecking, setIsAdminChecking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'admin' | 'voting'>('home');
  const [config, setConfig] = useState<Config>({ census: 500, adminPin: MASTER_PIN, sessionStatus: 'waiting' });

  useEffect(() => {
    // Check URL hash for view separation
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === '#admin') setView('admin');
      else if (hash === '#voting') setView('voting');
      else setView('home');
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setIsAdminChecking(true);
        try {
          // Force check against default admin email first for immediate access
          const isDefaultAdmin = u.email === 'archivosmipc14@gmail.com';
          
          // Also check database for other admins
          let hasAdminRole = false;
          if (u.email) {
            try {
              const adminDoc = await getDoc(doc(db, 'admin_emails', u.email.toLowerCase().trim()));
              if (adminDoc.exists()) {
                const data = adminDoc.data();
                hasAdminRole = data.enabled !== false; 
              }
            } catch (dbErr) {
              // Try cache fallback for admin check
              try {
                const adminDoc = await getDocFromCache(doc(db, 'admin_emails', u.email.toLowerCase().trim()));
                if (adminDoc.exists()) {
                  const data = adminDoc.data();
                  hasAdminRole = data.enabled !== false;
                }
              } catch (cacheErr) {
                // If both fail, we'll rely on isDefaultAdmin
              }
            }
          }
          
          setIsAdminUser(isDefaultAdmin || hasAdminRole);

        // If user is admin and config doesn't exist, initialize it
        if (isDefaultAdmin || hasAdminRole) {
          try {
            const configSnap = await getDoc(doc(db, 'config', 'general'));
            if (!configSnap.exists()) {
              await setDoc(doc(db, 'config', 'general'), { 
                census: 500, 
                sessionStatus: 'waiting',
                institutionName: 'INSTITUCIÓN EDUCATIVA VILLA MARGARITA',
                electionYear: '2026'
              });
              toast.info('Sistema inicializado por primera vez.');
            }
          } catch (initErr) {
            console.error("Error during admin-led initialization:", initErr);
          }
        } 
      } catch (err) {
          console.error("Error checking admin status:", err);
          setIsAdminUser(u.email === 'archivosmipc14@gmail.com');
        } finally {
          setIsAdminChecking(false);
          setLoading(false);
        }
      } else {
        setUser(null);
        setIsAdminUser(false);
        setIsAdminChecking(false);
        setLoading(false);
        signInAnonymously(auth).catch(console.error);
      }
    });

    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'connection_test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          toast.error("Error de conexión con la base de datos.");
        }
      }
    };
    testConnection();

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Config;
        setConfig({
          ...data,
          sessionStatus: data.sessionStatus || 'waiting'
        });
      }
    }, (err) => {
      console.warn("Config listener error:", err);
    });
    return unsubConfig;
  }, []);

  const handleAdminLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    // Force select account to help with iframe issues
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error('La ventana de inicio de sesión fue cerrada. Por favor, intenta de nuevo.');
      } else if (err.code === 'auth/cancelled-by-user') {
        // Ignore
      } else {
        console.error("Login error:", err);
        toast.error('Error al iniciar sesión: ' + (err.message || 'Error desconocido'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBulkLoad = async () => {
    if (!confirm('¿Estás seguro de cargar los datos masivos? Esto agregará candidatos y mesas según el reporte de la I.E. Villa Margarita.')) return;
    
    setIsBulkLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Add mesas
      INITIAL_MESAS.forEach(mesa => {
        const mesaRef = doc(collection(db, 'mesas'));
        batch.set(mesaRef, {
          ...mesa,
          voterCount: 0,
          createdAt: serverTimestamp()
        });
      });

      // Add candidates
      INITIAL_CANDIDATES.forEach(cand => {
        const candRef = doc(collection(db, 'candidates'));
        batch.set(candRef, {
          ...cand,
          photoUrl: '',
          voteCount: 0,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast.success('Carga masiva completada con éxito');
    } catch (error) {
      console.error(error);
      toast.error('Error en la carga masiva');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro de REINICIAR LOS VOTOS? Esto borrará todos los votos registrados y pondrá los contadores a cero. Los candidatos y mesas se mantendrán. Esta acción no se puede deshacer.')) return;
    
    setIsBulkLoading(true);
    try {
      // Use batches for deletion (Firestore has a 500 operation limit per batch)
      const deleteCollection = async (collectionName: string) => {
        const snap = await getDocs(collection(db, collectionName));
        if (snap.empty) return;
        
        // Process in chunks of 500
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach(d => batch.delete(doc(db, collectionName, d.id)));
          await batch.commit();
        }
      };

      // 1. Delete all votes
      await deleteCollection('votes');
      
      // 2. Reset candidates voteCount to 0
      const candSnap = await getDocs(collection(db, 'candidates'));
      if (!candSnap.empty) {
        const docs = candSnap.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach(d => batch.update(doc(db, 'candidates', d.id), { voteCount: 0 }));
          await batch.commit();
        }
      }

      // 3. Reset mesas voterCount to 0
      const mesaSnap = await getDocs(collection(db, 'mesas'));
      if (!mesaSnap.empty) {
        const docs = mesaSnap.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach(d => batch.update(doc(db, 'mesas', d.id), { voterCount: 0 }));
          await batch.commit();
        }
      }
      
      // 4. Reset config fully (keep census, institutionName, electionYear)
      const configSnap = await getDoc(doc(db, 'config', 'general'));
      const currentConfig = configSnap.exists() ? configSnap.data() : {};
      
      await setDoc(doc(db, 'config', 'general'), {
        census: currentConfig.census || 500,
        institutionName: currentConfig.institutionName || 'INSTITUCIÓN EDUCATIVA VILLA MARGARITA',
        electionYear: currentConfig.electionYear || '2026',
        sessionStatus: 'waiting',
        sessionStart: null,
        sessionEnd: null,
        initialSnapshot: null,
        finalSnapshot: null,
        blancoVotes: { personeria: 0, contraloria: 0, consejo: 0 }
      });
      
      toast.success('Votos reiniciados correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al reiniciar los votos');
    } finally {
      setIsBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full mb-6 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        />
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs"
        >
          Cargando Sistema...
        </motion.p>
      </div>
    );
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black tracking-widest uppercase opacity-50">Cargando Sistema...</h2>
        </div>
      );
    }

    try {
      if (view === 'home') {
      const instName = config.institutionName || 'INSTITUCIÓN EDUCATIVA VILLA MARGARITA';
      const year = config.electionYear || '2026';
      
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
          {/* Discreet Admin Access */}
          <header className="p-4 md:p-6 flex justify-end">
             <button 
               onClick={() => window.location.hash = 'admin'}
               className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white transition-all"
               title="Administración"
             >
               <ShieldCheck size={20} />
             </button>
          </header>

          <main className="flex-1 flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="max-w-5xl w-full bg-white rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] md:min-h-[600px]"
            >
              {/* Left Side: Info */}
              <div className="md:w-1/2 bg-indigo-600 p-8 md:p-16 text-white flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 md:w-80 md:h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 md:w-80 md:h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 backdrop-blur-md rounded-2xl md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-10 shadow-2xl border border-white/30">
                    <School className="w-8 h-8 md:w-12 md:h-12" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black mb-4 md:mb-6 leading-tight tracking-tight">
                    Elecciones <br />
                    Escolares <span className="text-indigo-200">{year}</span>
                  </h1>
                  <p className="text-indigo-100/90 text-base md:text-xl font-medium leading-relaxed">
                    Plataforma oficial de votación digital para la <br className="hidden md:block" />
                    <span className="font-bold text-white uppercase tracking-wide">{instName}</span>.
                  </p>
                  
                  <div className="mt-8 md:mt-16 flex items-center gap-3 md:gap-4 bg-white/10 backdrop-blur-sm p-3 md:p-4 rounded-xl md:rounded-2xl w-fit border border-white/10">
                    <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full animate-pulse ${config.sessionStatus === 'active' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]'}`}></div>
                    <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-indigo-50">
                      Jornada {config.sessionStatus === 'active' ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Right Side: Actions */}
              <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
                <div className="mb-8 md:mb-12">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 md:mb-4">Bienvenido</h2>
                  <p className="text-slate-500 text-base md:text-lg">Selecciona una opción para continuar con el proceso electoral.</p>
                </div>
                
                <div className="space-y-4 md:space-y-6">
                  <button 
                    onClick={() => window.location.hash = 'voting'}
                    className="w-full p-6 md:p-8 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-[2rem] hover:border-indigo-600 hover:bg-indigo-50 transition-all group text-left flex items-center gap-4 md:gap-8 shadow-sm hover:shadow-md"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner shrink-0">
                      <Settings className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg md:text-xl">Configurar Mesa</h3>
                      <p className="text-slate-500 font-medium text-sm md:text-base">Habilitar este dispositivo para recibir votos</p>
                    </div>
                  </button>
                </div>
                
                <div className="mt-10 md:mt-20 pt-6 md:pt-8 border-t border-slate-100 flex flex-col items-center">
                  <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest text-center">
                    © {year} {instName}
                  </p>
                  <p className="text-slate-300 text-[10px] md:text-xs mt-2 text-center">Sistema de Gestión Electoral Institucional</p>
                </div>
              </div>
            </motion.div>
          </main>
        </div>
      );
    }

    if (view === 'admin') {
      if (!user || user.isAnonymous || isAdminChecking) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 md:p-8 text-white text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm w-full">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 backdrop-blur-md border border-white/10 shadow-2xl">
                {isAdminChecking ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 md:w-12 md:h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full" />
                ) : (
                  <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-indigo-400" />
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-3 md:mb-4 tracking-tight">
                {isAdminChecking ? 'Verificando...' : 'Acceso Restringido'}
              </h2>
              <p className="text-slate-400 mb-8 md:mb-12 leading-relaxed text-sm md:text-base">
                {isAdminChecking ? 'Estamos validando tus credenciales de administrador.' : 'Solo personal autorizado puede acceder al panel de administración. Por favor, inicia sesión con tu cuenta institucional.'}
              </p>
              
              {!isAdminChecking && (
                <>
                  <button 
                    type="button"
                    onClick={handleAdminLogin}
                    disabled={isLoggingIn}
                    className="w-full py-4 md:py-5 bg-white text-slate-900 rounded-2xl font-black text-base md:text-lg shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 md:gap-4 mb-6 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 md:w-6 md:h-6 border-2 border-slate-900/20 border-t-slate-900 rounded-full" />
                    ) : (
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                    {isLoggingIn ? 'Iniciando sesión...' : 'Continuar con Google'}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => window.location.hash = ''}
                    className="mt-6 md:mt-8 text-slate-500 hover:text-slate-300 transition-colors text-xs md:text-sm font-bold uppercase tracking-widest"
                  >
                    Volver al Inicio
                  </button>
                </>
              )}
            </motion.div>
          </div>
        );
      }

      if (!isAdminUser) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8 text-white text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm w-full">
              <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-md border border-red-500/20">
                <ShieldCheck size={48} />
              </div>
              <h2 className="text-3xl font-black mb-4 tracking-tight text-red-500">Sin Permisos</h2>
              <p className="text-slate-400 mb-12 leading-relaxed">La cuenta <strong>{user.email}</strong> no está registrada como administrador. Si crees que esto es un error, contacta al soporte técnico.</p>
              
              <button 
                type="button"
                onClick={() => signOut(auth)}
                className="w-full py-5 bg-slate-800 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-700 transition-all mb-6 active:scale-95"
              >
                Cerrar Sesión
              </button>
              
              <button 
                type="button"
                onClick={() => window.location.hash = ''}
                className="mt-8 text-slate-500 hover:text-slate-300 transition-colors text-sm font-bold uppercase tracking-widest"
              >
                Volver al Inicio
              </button>
            </motion.div>
          </div>
        );
      }

      return <AdminDashboard onLogout={() => signOut(auth)} handleBulkLoad={handleBulkLoad} handleClearAll={handleClearAll} isBulkLoading={isBulkLoading} />;
    }

    // Voting View
    return <StudentVoting config={config} />;
    } catch (err) {
      console.error("Error rendering content:", err);
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Error de Visualización</h2>
            <p className="text-slate-600 mb-6">Hubo un problema al cargar esta sección. Por favor, intenta recargar la página.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <ErrorBoundary>
      <PWAStatus />
      <OnlineStatus />
      {renderContent()}
    </ErrorBoundary>
  );
}
