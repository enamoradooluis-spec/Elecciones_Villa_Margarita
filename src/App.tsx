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
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
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
  Edit2
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
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

// --- Types ---
interface Config {
  census: number;
}
interface Candidate {
  id: string;
  name: string;
  photoUrl?: string;
  position: 'personeria' | 'contraloria' | 'consejo';
  grade?: string;
  number: number;
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

// --- Components ---

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [config, setConfig] = useState<Config>({ census: 500, adminPin: MASTER_PIN });
  const [activeTab, setActiveTab] = useState<'candidates' | 'results' | 'mesas' | 'settings'>('results');
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({ position: 'personeria' });
  const [isAddingMesa, setIsAddingMesa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newMesa, setNewMesa] = useState<Partial<Mesa>>({ pin: '1234' });
  const [selectedMesaFilter, setSelectedMesaFilter] = useState<string>('all');
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    const unsubCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'candidates'));
    const unsubVotes = onSnapshot(collection(db, 'votes'), (snapshot) => {
      setVotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoteRecord)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'votes'));
    const unsubMesas = onSnapshot(collection(db, 'mesas'), (snapshot) => {
      setMesas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mesa)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'mesas'));
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as Config);
    });
    const unsubAdminEmails = onSnapshot(collection(db, 'admin_emails'), (snapshot) => {
      setAdminEmails(snapshot.docs.map(doc => doc.id));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'admin_emails'));

    return () => {
      unsubCandidates();
      unsubVotes();
      unsubMesas();
      unsubConfig();
      unsubAdminEmails();
    };
  }, []);

  const [isResetting, setIsResetting] = useState(false);
  const [isSeedingCandidates, setIsSeedingCandidates] = useState(false);
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

  const handleUpdateConfig = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'general'), config);
      toast.success('Configuración actualizada correctamente.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/general');
    } finally {
      setIsSaving(false);
    }
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
      });
      setNewAdminEmail('');
      toast.success('Administrador agregado.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'admin_emails');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAdminEmail = async (email: string) => {
    if (email === 'enamoradooluis@gmail.com') {
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
      const deletePromises = voteSnaps.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // Reset mesa counters
      const mesaPromises = mesas.map(m => updateDoc(doc(db, 'mesas', m.id), { voterCount: 0 }));
      await Promise.all(mesaPromises);

      toast.success('Elección reiniciada correctamente. Todo está en cero.');
      setIsResetting(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'votes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedCandidates = async () => {
    setIsSaving(true);
    try {
      const candidatesToSeed = [
        // Personeria
        { name: 'LUIS MATEO PEÑA MERCADO', position: 'personeria', number: 1 },
        { name: 'CRISTIAN LOPEZ ECHEVERRY', position: 'personeria', number: 2 },
        { name: 'EDGAR JOEL VERTEL TORRES', position: 'personeria', number: 3 },
        // Contraloria
        { name: 'PADILLA MENDOZA YESID DAVID', position: 'contraloria', number: 1 },
        { name: 'CONTRERAS CASTAÑO JUAN JOSE', position: 'contraloria', number: 2 },
        { name: 'CASTRO GONZALEZ BELLYS SOFIA', position: 'contraloria', number: 3 },
        // Consejo 3
        { name: 'KATIUSCA URDANETAS NAVAS', position: 'consejo', number: 1, grade: '3°' },
        { name: 'YURAIDIS MARIA MERCADO MORALES', position: 'consejo', number: 2, grade: '3°' },
        { name: 'CASTRILLON RIVAS FREDDIER', position: 'consejo', number: 3, grade: '3°' },
        // Consejo 4
        { name: 'SUAREZ HERRERA MILAN ANDRES', position: 'consejo', number: 1, grade: '4°' },
        { name: 'COGOLLO VARGAS ELIAN DAVID', position: 'consejo', number: 2, grade: '4°' },
        { name: 'GOMÉZ TERAN KEISY', position: 'consejo', number: 3, grade: '4°' },
        { name: 'MORALES CAMAÑO KIARA', position: 'consejo', number: 4, grade: '4°' },
        { name: 'COGOLLO CARPIO SAMARA MICHEL', position: 'consejo', number: 5, grade: '4°' },
        { name: 'CASTILLO LOPEZ JOSE DAVID', position: 'consejo', number: 6, grade: '4°' },
        // Consejo 5
        { name: 'HERRERA MARTINEZ DAYANA', position: 'consejo', number: 1, grade: '5°' },
        { name: 'MORALES ESPITIA MARIANA', position: 'consejo', number: 2, grade: '5°' },
        { name: 'COGOLLO TORRES MAUREN JOSÉ', position: 'consejo', number: 3, grade: '5°' },
        { name: 'MONTALVO LOPEZ MARIAN SARAY', position: 'consejo', number: 4, grade: '5°' },
        { name: 'JAMER DAVID MONTALVO MEZA', position: 'consejo', number: 5, grade: '5°' },
        // Consejo 6
        { name: 'FERNANDEZ DORIA SHAROL JULIANA', position: 'consejo', number: 1, grade: '6°' },
        { name: 'FUENTES VILLEGAS WENDERLYS', position: 'consejo', number: 2, grade: '6°' },
        { name: 'MENDOZA SANCHEZ ANDERSON DAVID', position: 'consejo', number: 3, grade: '6°' },
        { name: 'GALARCIO MORELO JULIANA MAIREL', position: 'consejo', number: 4, grade: '6°' },
        { name: 'LAZARO CRISTINA ISABEL', position: 'consejo', number: 5, grade: '6°' },
        { name: 'ARAUJO REYES DELIANNIS NICOL', position: 'consejo', number: 6, grade: '6°' },
        // Consejo 7
        { name: 'PEÑATE MORELO MARIA ANGEL', position: 'consejo', number: 1, grade: '7°' },
        { name: 'YEPES CASARUBIA AURI ESTELA', position: 'consejo', number: 2, grade: '7°' },
        { name: 'MACHADO LOZADA EFRAIN DANIEL', position: 'consejo', number: 3, grade: '7°' },
        { name: 'MARTINEZ MIGUEL ANDRES', position: 'consejo', number: 4, grade: '7°' },
        { name: 'ALEJO CALZADILLA MARIANGEL', position: 'consejo', number: 5, grade: '7°' },
        { name: 'RIVAS ARIETA NEIMAR ANDRES', position: 'consejo', number: 6, grade: '7°' },
        // Consejo 8
        { name: 'VILORIA JULIO LUIS DAVID', position: 'consejo', number: 1, grade: '8°' },
        { name: 'MARTINEZ LONDOÑO CELESTE', position: 'consejo', number: 2, grade: '8°' },
        { name: 'MORALES CAMAÑO DUVÁN', position: 'consejo', number: 3, grade: '8°' },
        { name: 'DIAZ DOMINGUEZ ROSALÍA', position: 'consejo', number: 4, grade: '8°' },
        { name: 'VILLEGAS DORIA CAMILO ANDRES', position: 'consejo', number: 5, grade: '8°' },
        { name: 'RUIZ GUZMAN ANA KARINA', position: 'consejo', number: 6, grade: '8°' },
        // Consejo 9
        { name: 'FLORES UBARNES KHANDY SOFIA', position: 'consejo', number: 1, grade: '9°' },
        { name: 'MORALES GUZMAN LUISA FERNADA', position: 'consejo', number: 2, grade: '9°' },
        { name: 'MARTINEZ HERRERA LUIS ANGEL', position: 'consejo', number: 3, grade: '9°' },
        { name: 'HOYOLA MIRANDA ANTONELA', position: 'consejo', number: 4, grade: '9°' },
        { name: 'REYES PASTRANA ROSA ISABEL', position: 'consejo', number: 5, grade: '9°' },
        // Consejo 10
        { name: 'PAEZ MARTINEZ JUAN PABLO', position: 'consejo', number: 1, grade: '10°' },
        { name: 'PERERIRA GUEVARA ANDREA PAOLA', position: 'consejo', number: 2, grade: '10°' },
        { name: 'LOPEZ MULASCO MELISSA ANDREA', position: 'consejo', number: 3, grade: '10°' },
        // Consejo 11
        { name: 'RESTREPO LEDESMA GUSTAVO', position: 'consejo', number: 1, grade: '11°' },
        { name: 'LLORENTE PETRO DANA', position: 'consejo', number: 2, grade: '11°' },
        { name: 'SEPULVEDA ALVAREZ SILVANA', position: 'consejo', number: 3, grade: '11°' },
      ];

      for (const cand of candidatesToSeed) {
        await addDoc(collection(db, 'candidates'), cand);
      }
      toast.success('Todos los candidatos han sido cargados correctamente.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'candidates');
    } finally {
      setIsSaving(false);
    }
  };

  const generateResultsPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text('IE VILLA MARGARITA - ELECCIONES 2026', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text('ACTA DE ESCRUTINIO Y RESULTADOS FINALES', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, pageWidth / 2, 38, { align: 'center' });

    let currentY = 50;

    const filteredVotes = selectedMesaFilter === 'all' 
      ? votes 
      : votes.filter(v => v.mesaId === selectedMesaFilter);

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > 270) {
        doc.addPage();
        currentY = 20;
      }
    };

    // 1. CONSEJO POR GRADO
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('1. CONSEJO ESTUDIANTIL - DESGLOSE POR GRADO', 14, currentY);
    currentY += 10;

    const consejoCandidates = candidates.filter(c => c.position === 'consejo');
    
    for (const grade of GRADES) {
      const gradeCandidates = consejoCandidates.filter(c => c.grade === grade);
      const gradeVotes = filteredVotes.filter(v => v.position === 'consejo' && v.grade === grade);
      
      if (gradeCandidates.length === 0 && gradeVotes.length === 0) continue;

      const data = gradeCandidates.map(c => ({
        name: c.name,
        votes: gradeVotes.filter(v => v.candidateId === c.id).length
      }));

      const blancoVotes = gradeVotes.filter(v => v.candidateId === 'blanco').length;
      data.push({ name: 'Voto en Blanco', votes: blancoVotes });

      data.sort((a, b) => b.votes - a.votes);
      
      const winner = data[0]?.votes > 0 ? data[0].name : 'Empate / Sin votos';

      checkPageBreak(40);

      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text(`Grado ${grade} - Ganador: ${winner}`, 14, currentY);
      currentY += 8;

      const tableData = data.map(c => [c.name, c.votes]);
      autoTable(doc, {
        startY: currentY,
        head: [['Candidato', 'Votos']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 2. CONSEJO GENERAL
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('2. CONSEJO ESTUDIANTIL - RESULTADO GENERAL', 14, currentY);
    currentY += 10;

    const consejoData = consejoCandidates.map(c => ({
      name: c.name,
      grade: c.grade || 'N/A',
      votes: filteredVotes.filter(v => v.candidateId === c.id).length
    }));
    const consejoBlanco = filteredVotes.filter(v => v.position === 'consejo' && v.candidateId === 'blanco').length;
    consejoData.push({ name: 'Voto en Blanco', grade: '-', votes: consejoBlanco });
    consejoData.sort((a, b) => {
      if (a.name === 'Voto en Blanco') return 1;
      if (b.name === 'Voto en Blanco') return -1;
      const gradeA = GRADES.indexOf(a.grade);
      const gradeB = GRADES.indexOf(b.grade);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return b.votes - a.votes;
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Candidato', 'Grado', 'Votos']],
      body: consejoData.map(c => [c.name, c.grade, c.votes]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;

    // 3. CONTRALORÍA
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('3. CONTRALORÍA - RESULTADO GENERAL', 14, currentY);
    currentY += 10;

    const contraloriaCandidates = candidates.filter(c => c.position === 'contraloria');
    const contraloriaData = contraloriaCandidates.map(c => ({
      name: c.name,
      grade: c.grade || 'N/A',
      votes: filteredVotes.filter(v => v.candidateId === c.id).length
    }));
    const contraloriaBlanco = filteredVotes.filter(v => v.position === 'contraloria' && v.candidateId === 'blanco').length;
    contraloriaData.push({ name: 'Voto en Blanco', grade: '-', votes: contraloriaBlanco });
    contraloriaData.sort((a, b) => {
      if (a.name === 'Voto en Blanco') return 1;
      if (b.name === 'Voto en Blanco') return -1;
      const gradeA = GRADES.indexOf(a.grade);
      const gradeB = GRADES.indexOf(b.grade);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return b.votes - a.votes;
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Candidato', 'Grado', 'Votos']],
      body: contraloriaData.map(c => [c.name, c.grade, c.votes]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;

    // 4. PERSONERÍA
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('4. PERSONERÍA - RESULTADO GENERAL', 14, currentY);
    currentY += 10;

    const personeriaCandidates = candidates.filter(c => c.position === 'personeria');
    const personeriaData = personeriaCandidates.map(c => ({
      name: c.name,
      grade: c.grade || 'N/A',
      votes: filteredVotes.filter(v => v.candidateId === c.id).length
    }));
    const personeriaBlanco = filteredVotes.filter(v => v.position === 'personeria' && v.candidateId === 'blanco').length;
    personeriaData.push({ name: 'Voto en Blanco', grade: '-', votes: personeriaBlanco });
    personeriaData.sort((a, b) => {
      if (a.name === 'Voto en Blanco') return 1;
      if (b.name === 'Voto en Blanco') return -1;
      const gradeA = GRADES.indexOf(a.grade);
      const gradeB = GRADES.indexOf(b.grade);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return b.votes - a.votes;
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Candidato', 'Grado', 'Votos']],
      body: personeriaData.map(c => [c.name, c.grade, c.votes]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;

    // Signatures
    checkPageBreak(40);
    currentY += 20;
    doc.line(20, currentY, 80, currentY);
    doc.line(120, currentY, 180, currentY);
    doc.text('Firma Rectoría', 20, currentY + 5);
    doc.text('Firma Jurado de Votación', 120, currentY + 5);

    doc.save('Escrutinio_Villa_Margarita_2026.pdf');
    toast.success('Reporte PDF generado correctamente.');
  };

  const generateMesasPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text('IE VILLA MARGARITA - ELECCIONES 2026', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text('REPORTE DE MESAS DE VOTACIÓN', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, pageWidth / 2, 38, { align: 'center' });

    const tableData = mesas.map(m => [m.name, m.grade, m.pin]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Nombre de la Mesa', 'Grado Asignado', 'PIN de Seguridad']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('Mesas_Villa_Margarita_2026.pdf');
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
        await addDoc(collection(db, 'mesas'), { ...newMesa, voterCount: 0 });
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
    const totalVotes = votes.length;
    const uniqueVoters = new Set(votes.map(v => v.voterId)).size;
    const totalMesas = mesas.length;
    const totalCandidates = candidates.length;
    
    // Participation by Mesa
    const mesaParticipation = mesas.map(m => ({
      name: m.name,
      count: votes.filter(v => v.mesaId === m.id).length / 3 // Divide by 3 because each student votes for 3 positions
    }));

    // Votes by Grade
    const gradeStats = GRADES.map(g => ({
      name: g,
      count: votes.filter(v => v.grade === g).length / 3
    }));

    return { totalVotes, uniqueVoters, totalMesas, totalCandidates, mesaParticipation, gradeStats };
  }, [votes, mesas, candidates]);

  const resultsData = useMemo(() => {
    const filteredVotes = selectedMesaFilter === 'all' 
      ? votes 
      : votes.filter(v => v.mesaId === selectedMesaFilter);

    const positions = ['personeria', 'contraloria', 'consejo'];
    return positions.map(pos => {
      const posCandidates = candidates.filter(c => c.position === pos);
      const data = posCandidates.map(c => ({
        name: c.name,
        votes: filteredVotes.filter(v => v.candidateId === c.id).length,
        grade: c.grade
      }));
      
      // Add Voto en Blanco
      const blancoVotes = filteredVotes.filter(v => v.candidateId === 'blanco' && v.position === pos).length;
      data.push({ name: 'Voto en Blanco', votes: blancoVotes, grade: '' });
      
      return { position: pos, data: data.sort((a, b) => b.votes - a.votes) };
    });
  }, [candidates, votes, selectedMesaFilter]);

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
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Villa Margarita</h1>
            <p className="text-slate-500">Panel de Administración Electoral</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </header>

      <nav className="flex gap-2 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        <button 
          onClick={() => setActiveTab('results')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'results' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Resultados
        </button>
        <button 
          onClick={() => setActiveTab('candidates')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'candidates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Candidatos
        </button>
        <button 
          onClick={() => setActiveTab('mesas')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'mesas' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Mesas
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
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
                  <div className="h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                <div className="h-[300px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={stats.gradeStats}>
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
                <div className="h-[300px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
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
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
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
              {mesas.map(m => (
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
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
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Settings size={24} className="text-indigo-600" />
                Configuración General
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Censo Electoral (Total Estudiantes)</label>
                  <div className="flex gap-4">
                    <input 
                      type="number" 
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={config.census}
                      onChange={e => setConfig({ ...config, census: Number(e.target.value) })}
                    />
                    <button 
                      onClick={handleUpdateConfig}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Actualizar
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Este número se usa para calcular el porcentaje de participación.</p>
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
                      <span className="text-sm font-medium text-slate-700">enamoradooluis@gmail.com</span>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-100 px-2 py-1 rounded-md">Principal</span>
                    </div>
                    {/* Other Admins */}
                    {adminEmails.filter(email => email !== 'enamoradooluis@gmail.com').map(email => (
                      <div key={email} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-sm text-slate-700">{email}</span>
                        <button
                          onClick={() => handleRemoveAdminEmail(email)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar administrador"
                        >
                          <Trash2 size={16} />
                        </button>
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
                  onClick={() => setIsSeedingCandidates(true)}
                  className="flex items-center justify-center gap-3 p-4 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all font-bold"
                >
                  <Plus size={20} />
                  Cargar Candidatos Oficiales
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
                  onClick={() => setIsResetting(true)}
                  className="flex items-center justify-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all font-bold"
                >
                  <Trash2 size={20} />
                  Reiniciar Elección (Borrar Todo)
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

      {/* Seed Candidates Confirmation Modal */}
      <AnimatePresence>
        {isSeedingCandidates && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Cargar Candidatos?</h3>
              <p className="text-slate-500 mb-6">¿Cargar la lista oficial de candidatos 2026? Esto agregará a todos los candidatos predefinidos.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsSeedingCandidates(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    await handleSeedCandidates();
                    setIsSeedingCandidates(false);
                  }}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Cargando...' : 'Cargar Lista'}
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
  );
};

const StudentVoting = () => {
  const [step, setStep] = useState<'setup' | 'start' | 'consejo' | 'contraloria' | 'personeria' | 'success'>('setup');
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selections, setSelections] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [isResettingMesa, setIsResettingMesa] = useState(false);
  const [resetPin, setResetPin] = useState('');

  useEffect(() => {
    const unsubCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'candidates'));
    const unsubMesas = onSnapshot(collection(db, 'mesas'), (snapshot) => {
      setMesas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mesa)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'mesas'));

    // Check localStorage for saved mesa
    const savedMesaId = localStorage.getItem('villa_margarita_mesa_id');
    if (savedMesaId) {
      getDoc(doc(db, 'mesas', savedMesaId)).then(snap => {
        if (snap.exists()) {
          setSelectedMesa({ id: snap.id, ...snap.data() } as Mesa);
          setStep('start');
        } else {
          localStorage.removeItem('villa_margarita_mesa_id');
          setStep('setup');
        }
      });
    } else {
      setStep('setup');
    }

    return () => {
      unsubCandidates();
      unsubMesas();
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
      const votePromises = Object.entries(finalSelections).map(([pos, candId]) => 
        addDoc(collection(db, 'votes'), {
          candidateId: candId,
          position: pos,
          grade: selectedMesa.grade,
          mesaId: selectedMesa.id,
          mesaName: selectedMesa.name,
          timestamp: serverTimestamp(),
          voterId: 'anonymous_' + Date.now()
        })
      );
      await Promise.all(votePromises);
      
      // Increment voter count for the mesa
      await updateDoc(doc(db, 'mesas', selectedMesa.id), {
        voterCount: (selectedMesa.voterCount || 0) + 1
      });

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

  if (step === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Configuración de Mesa</h1>
          <p className="text-slate-500 mb-8">Selecciona la mesa asignada a este dispositivo</p>
          
          <div className="space-y-4">
            <input 
              type="password" 
              placeholder="PIN de Seguridad"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold"
              value={setupPin}
              onChange={e => setSetupPin(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            
            <div className="grid grid-cols-1 gap-3">
              {mesas.map(m => (
                <button 
                  key={m.id}
                  onClick={() => handleSetup(m)}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-slate-900">{m.name}</span>
                    <p className="text-xs text-slate-500">Grado: {m.grade}</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
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
          onDoubleClick={() => setIsResettingMesa(true)}
          className="absolute top-8 left-8 text-white/20 hover:text-white/50 transition-colors"
        >
          <School size={32} />
        </button>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-12 rounded-3xl shadow-2xl w-full max-w-xl text-center">
          <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <Vote size={48} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4">Villa Margarita</h1>
          <div className="bg-indigo-50 px-6 py-3 rounded-2xl inline-block mb-12">
            <p className="text-indigo-700 font-bold text-lg">
              {selectedMesa?.name} • Grado {selectedMesa?.grade}
            </p>
          </div>
          
          <button 
            onClick={() => setStep('consejo')}
            className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black text-2xl hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-4"
          >
            Comenzar a Votar
            <ChevronRight size={32} />
          </button>
          <p className="mt-8 text-slate-400 text-sm">Moderador presente en mesa para asistencia</p>
        </motion.div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-500 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={56} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">¡Voto Registrado!</h1>
          <p className="text-slate-600 mb-8 text-lg">Gracias por participar. Por favor, retírate de la mesa.</p>
          
          <div className="relative w-20 h-20 mx-auto mb-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-slate-100 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
              <motion.circle className="text-green-500 stroke-current" strokeWidth="10" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" initial={{ pathLength: 1 }} animate={{ pathLength: 0 }} transition={{ duration: 10, ease: "linear" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-slate-900">{cooldown}</div>
          </div>
          <p className="text-slate-400 text-sm">Siguiente estudiante en {cooldown} segundos...</p>
        </motion.div>
      </div>
    );
  }

  const currentPosition = step as 'personeria' | 'contraloria' | 'consejo';
  const filteredCandidates = candidates.filter(c => {
    if (currentPosition === 'consejo') {
      return c.position === 'consejo' && c.grade === selectedMesa?.grade;
    }
    return c.position === currentPosition;
  });

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
        <header className="mb-12 text-center">
          <div className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
            Paso {getStepNumber()} de {getTotalSteps()}
          </div>
          <h2 className="text-4xl font-black text-slate-900 capitalize mb-2">
            Votación para {currentPosition}
          </h2>
          <p className="text-slate-500">Selecciona a tu candidato preferido de la lista</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCandidates.map(c => (
            <motion.button
              key={c.id}
              disabled={isProcessing}
              whileHover={!isProcessing ? { y: -5 } : {}}
              whileTap={!isProcessing ? { scale: 0.98 } : {}}
              onClick={() => handleVote(c.id, currentPosition)}
              className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 border-transparent transition-all text-left group ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-600'}`}
            >
              <div className="aspect-square bg-slate-100 relative">
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <UserIcon size={80} />
                  </div>
                )}
                <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center font-black text-2xl text-indigo-600">
                  {c.number}
                </div>
              </div>
              <div className="p-6">
                <h3 className={`text-xl font-bold text-slate-900 transition-colors ${!isProcessing && 'group-hover:text-indigo-600'}`}>{c.name}</h3>
                <p className="text-slate-500 text-sm">Candidato # {c.number}</p>
              </div>
            </motion.button>
          ))}
          
          {/* Voto en Blanco */}
          <motion.button
            disabled={isProcessing}
            whileHover={!isProcessing ? { y: -5 } : {}}
            whileTap={!isProcessing ? { scale: 0.98 } : {}}
            onClick={() => handleVote('blanco', currentPosition)}
            className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 border-transparent transition-all text-left flex flex-col items-center justify-center p-8 min-h-[300px] ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400'}`}
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Plus size={40} className="rotate-45" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Voto en Blanco</h3>
            <p className="text-slate-500 text-sm">Ninguno de los anteriores</p>
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
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
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
  const [loading, setLoading] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);

  useEffect(() => {
    // Check URL hash for view separation
    const checkHash = () => {
      setIsAdminView(window.location.hash === '#admin');
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          // Force check against default admin email first for immediate access
          const isDefaultAdmin = u.email === 'enamoradooluis@gmail.com';
          
          // Also check database for other admins
          let hasAdminRole = false;
          if (u.email) {
            const adminDoc = await getDoc(doc(db, 'admin_emails', u.email));
            hasAdminRole = adminDoc.exists();
          }
          
          setIsAdminUser(isDefaultAdmin || hasAdminRole);
        } catch (err) {
          console.error("Error checking admin status:", err);
          // Fallback to email check if Firestore fails
          setIsAdminUser(u.email === 'enamoradooluis@gmail.com');
        }
        setLoading(false);
      } else {
        setUser(null);
        setIsAdminUser(false);
        // If not signed in, sign in anonymously to satisfy security rules
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will fire again with the anonymous user
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          setLoading(false);
        }
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

  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const [config, setConfig] = useState<Config>({ census: 500, adminPin: MASTER_PIN });

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as Config);
      } else {
        // Initialize config if it doesn't exist
        setDoc(doc(db, 'config', 'general'), { census: 500 })
          .catch(err => console.error("Error initializing config:", err));
      }
    }, (err) => {
      console.warn("Config listener error:", err);
    });
    return unsubConfig;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Admin View
  const renderContent = () => {
    if (isAdminView) {
      if (!user || user.isAnonymous) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8 text-white text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm w-full">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-md">
                <ShieldCheck size={48} />
              </div>
              <h2 className="text-3xl font-bold mb-4">Administración</h2>
              <p className="text-slate-400 mb-12">Inicia sesión con tu cuenta de Google autorizada.</p>
              
              <button 
                type="button"
                onClick={handleAdminLogin}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 mb-6"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Iniciar Sesión con Google
              </button>
              
              <button 
                type="button"
                onClick={() => window.location.hash = ''}
                className="mt-8 text-slate-500 hover:text-slate-300 transition-colors text-sm"
              >
                Volver a Votación
              </button>
            </motion.div>
          </div>
        );
      }

      if (!isAdminUser) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8 text-white text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm w-full">
              <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-md">
                <ShieldCheck size={48} />
              </div>
              <h2 className="text-3xl font-bold mb-4">Acceso Denegado</h2>
              <p className="text-slate-400 mb-12">Tu cuenta ({user.email}) no tiene permisos de administrador.</p>
              
              <button 
                type="button"
                onClick={() => signOut(auth)}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-700 transition-all mb-6"
              >
                Cerrar Sesión
              </button>
              
              <button 
                type="button"
                onClick={() => window.location.hash = ''}
                className="mt-8 text-slate-500 hover:text-slate-300 transition-colors text-sm"
              >
                Volver a Votación
              </button>
            </motion.div>
          </div>
        );
      }

      return <AdminDashboard onLogout={() => signOut(auth)} />;
    }

    // Student View (Default)
    return <StudentVoting />;
  };

  return (
    <ErrorBoundary>
      {renderContent()}
    </ErrorBoundary>
  );
}
