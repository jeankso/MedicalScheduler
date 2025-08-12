import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Smartphone, 
  LogIn,
  LogOut,
  Search, 
  User, 
  UserPlus,
  ArrowLeft,
  Stethoscope,
  Paperclip,
  Camera,
  CheckCircle,
  AlertTriangle,
  Upload,
  Monitor,
  FileText,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import NotificationBanner from "@/components/NotificationBanner";

// CPF validation function
const isValidCPF = (cpf: string): boolean => {
  // Remove special characters
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  // Check if it has 11 digits
  if (cleanCPF.length !== 11) return false;
  
  // Check if all digits are the same (invalid CPFs)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let checkDigit1 = 11 - (sum % 11);
  if (checkDigit1 === 10 || checkDigit1 === 11) checkDigit1 = 0;
  if (checkDigit1 !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let checkDigit2 = 11 - (sum % 11);
  if (checkDigit2 === 10 || checkDigit2 === 11) checkDigit2 = 0;
  if (checkDigit2 !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

// Format CPF function
const formatCPF = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '');
  return cleanValue
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Component for image preview with FileReader for better compatibility
const ImagePreview = ({ file, borderColor = 'blue', size = 'small' }: { file: File; borderColor: 'blue' | 'green'; size?: 'small' | 'large' }) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (file && file.type && file.type.startsWith('image/')) {
      setLoading(true);
      setShowFallback(false);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageDataUrl(result);
        setLoading(false);
      };
      reader.onerror = () => {
        console.error('❌ FileReader failed to read file');
        setShowFallback(true);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } else {
      setShowFallback(true);
      setLoading(false);
    }
  }, [file]);

  const dimensions = size === 'large' ? 'w-16 h-16' : 'w-12 h-12';
  const iconSize = size === 'large' ? 'h-8 w-8' : 'h-6 w-6';

  if (loading) {
    return (
      <div className={`${dimensions} ${borderColor === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border-2 rounded-md flex items-center justify-center shadow animate-pulse`}>
        <div className={`${iconSize === 'h-8 w-8' ? 'h-4 w-4' : 'h-3 w-3'} ${borderColor === 'blue' ? 'bg-blue-300' : 'bg-green-300'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  if (showFallback || !imageDataUrl || !file?.type?.startsWith('image/')) {
    return (
      <div className={`${dimensions} ${borderColor === 'blue' ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300'} border-2 rounded-md flex items-center justify-center shadow`}>
        <FileText className={`${iconSize} ${borderColor === 'blue' ? 'text-blue-600' : 'text-green-600'}`} />
      </div>
    );
  }

  return (
    <img
      src={imageDataUrl}
      alt="Preview"
      className={`${dimensions} object-cover rounded-md border-2 ${borderColor === 'blue' ? 'border-blue-300' : 'border-green-300'} shadow`}
      onError={() => {
        console.log('❌ ImagePreview - Image failed to load with FileReader data');
        setShowFallback(true);
      }}
      onLoad={() => {
        console.log('✅ ImagePreview - Image loaded successfully with FileReader');
      }}
    />
  );
};

interface User {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface Patient {
  id: number;
  name: string;
  socialName?: string;
  cpf: string;
  age: number;
  birthDate?: string;
  phone: string;
  address?: string;
  idPhotoFront?: string;
  idPhotoBack?: string;
}

interface ExamType {
  id: number;
  name: string;
  monthlyQuota: number;
}

interface ConsultationType {
  id: number;
  name: string;
  monthlyQuota: number;
}

interface HealthUnit {
  id: number;
  name: string;
}

interface RequestWithRelations {
  id: number;
  status: string;
  createdAt?: string;
  attachmentFileName?: string;
  patient?: Patient;
  examType?: ExamType;
  consultationType?: ConsultationType;
}

export default function MobilePanelWorking() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<'login' | 'search' | 'patient' | 'request' | 'confirmation'>('login');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Confirmation page data
  const [confirmationData, setConfirmationData] = useState<{
    patient: Patient | null;
    createdRequests: any[];
    attachments: { [key: string]: File };
  }>({
    patient: null,
    createdRequests: [],
    attachments: {}
  });
  
  // Login form
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  
  // Patient search
  const [searchCpf, setSearchCpf] = useState("");
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  
  // Patient registration
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: "",
    socialName: "",
    cpf: "",
    birthDate: "",
    phone: "",
    address: ""
  });
  
  // Request form
  const [requestForm, setRequestForm] = useState({
    examTypes: [] as number[],
    consultationTypes: [] as number[],
    isUrgent: false,
    observations: "",
    healthUnitId: "",
    doctorId: ""
  });
  
  // File uploads
  const [uploading, setUploading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload modals for missing documents
  const [showEditPhotos, setShowEditPhotos] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<Patient | null>(null);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [selectedRequestForAttachment, setSelectedRequestForAttachment] = useState<RequestWithRelations | null>(null);
  
  // Identity photo modals
  const [showIdPhotoModal, setShowIdPhotoModal] = useState(false);
  const [showEditIdModal, setShowEditIdModal] = useState(false);
  
  // Search functionality for exams and consultations - unified search with debouncing
  const [serviceSearch, setServiceSearch] = useState("");
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState("");
  
  // Document attachments for each exam/consultation
  const [attachments, setAttachments] = useState<{[key: string]: File}>({});
  const attachmentRefs = useRef<{[key: string]: HTMLInputElement}>({});
  
  // Attachment upload status tracking
  const [uploadStatus, setUploadStatus] = useState<{[key: string]: 'pending' | 'uploading' | 'success' | 'error'}>({});
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  
  // Comments for requests
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedRequestForComment, setSelectedRequestForComment] = useState<RequestWithRelations | null>(null);
  const [requestComment, setRequestComment] = useState("");
  
  // Individual urgency and comments for each exam/consultation
  const [itemUrgency, setItemUrgency] = useState<{[key: string]: boolean}>({});
  const [itemComments, setItemComments] = useState<{[key: string]: string}>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debouncing effect for search performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedServiceSearch(serviceSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [serviceSearch]);

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === 'recepcao') {
            setUser(userData);
            setIsAuthenticated(true);
            setCurrentStep('search');
          }
        }
      } catch (error) {
        console.log('No active session found');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Fetch data with optimized caching
  const { data: examTypes = [] } = useQuery<ExamType[]>({
    queryKey: ['/api/exam-types'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  const { data: consultationTypes = [] } = useQuery<ConsultationType[]>({
    queryKey: ['/api/consultation-types'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  const { data: healthUnits = [] } = useQuery<HealthUnit[]>({
    queryKey: ['/api/health-units'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  const { data: doctors = [] } = useQuery<User[]>({
    queryKey: ['/api/users/by-role/recepcao'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  const { data: quotaUsage = [] } = useQuery({
    queryKey: ['/api/dashboard/quota-usage'],
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch user's recent requests with optimized caching
  const { data: userRecentRequests = [], isLoading: recentRequestsLoading, error: recentRequestsError } = useQuery<RequestWithRelations[]>({
    queryKey: [`/api/requests/user-recent/${user?.id}`],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000 // 3 minutes
  });

  // Debug logging removed for performance

  // Memoized filtered exam types for performance with debouncing
  const filteredExamTypes = useMemo(() => {
    return examTypes.filter((exam: ExamType) =>
      exam.name.toLowerCase().includes(debouncedServiceSearch.toLowerCase())
    );
  }, [examTypes, debouncedServiceSearch]);

  // Memoized filtered consultation types for performance with debouncing
  const filteredConsultationTypes = useMemo(() => {
    return consultationTypes.filter((consultation: ConsultationType) =>
      consultation.name.toLowerCase().includes(debouncedServiceSearch.toLowerCase())
    );
  }, [consultationTypes, debouncedServiceSearch]);

  // Memoized helper function to get quota status
  const getQuotaStatus = useCallback((serviceName: string, type: 'exam' | 'consultation') => {
    const usage = Array.isArray(quotaUsage) ? quotaUsage.find((q: any) => q.name === serviceName && q.type === type) : null;
    if (!usage) return { available: true, used: 0, quota: 0, remaining: 0 };
    
    const remaining = usage.quota - usage.used;
    return {
      available: remaining > 0,
      used: usage.used,
      quota: usage.quota,
      remaining
    };
  }, [quotaUsage]);

  // Helper function to check if patient has ID photos
  const hasIdPhotos = (patient: Patient | null): boolean => {
    return !!(patient?.idPhotoFront && patient?.idPhotoBack);
  };

  // Helper function to check if all selected services have attachments
  const allSelectedServicesHaveAttachments = (): boolean => {
    const selectedExams = requestForm.examTypes;
    const selectedConsultations = requestForm.consultationTypes;
    
    // Check if all selected exams have attachments
    for (const examId of selectedExams) {
      const attachmentKey = `exam-${examId}`;
      if (!attachments[attachmentKey]) {
        return false;
      }
    }
    
    // Check if all selected consultations have attachments
    for (const consultationId of selectedConsultations) {
      const attachmentKey = `consultation-${consultationId}`;
      if (!attachments[attachmentKey]) {
        return false;
      }
    }
    
    return true;
  };

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ patientId, file, photoType }: { patientId: number; file: File; photoType: 'front' | 'back' }) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', photoType);
      
      return apiRequest(`/api/patients/${patientId}/upload-photo`, "POST", formData);
    },
    onSuccess: (_, { photoType }) => {
      setUploading(null);
      // Refresh patient data
      if (foundPatient) {
        searchPatientMutation.mutate(foundPatient.cpf.replace(/\D/g, ''));
      }
      toast({
        title: "Foto enviada",
        description: `Foto do ${photoType === 'front' ? 'RG frente' : 'RG verso'} enviada com sucesso!`,
      });
    },
    onError: (error: any) => {
      setUploading(null);
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar foto",
        variant: "destructive",
      });
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Credenciais inválidas');
      }
      
      return response.json();
    },
    onSuccess: (userData) => {
      if (userData.role === 'recepcao') {
        setUser(userData);
        setIsAuthenticated(true);
        setCurrentStep('search');
        toast({
          title: "Login realizado",
          description: `Bem-vindo, ${userData.firstName || userData.username}!`,
        });
      } else {
        toast({
          title: "Acesso negado",
          description: "Esta área é exclusiva para recepcionistas.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    }
  });

  // Patient search mutation
  const searchPatientMutation = useMutation({
    mutationFn: async (cpf: string) => {
      const response = await fetch(`/api/patients/by-cpf/${cpf}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Paciente não encontrado');
        }
        throw new Error('Erro ao buscar paciente');
      }
      
      return response.json();
    },
    onSuccess: (patientData) => {
      if (patientData && patientData.id) {
        setFoundPatient(patientData as Patient);
        setCurrentStep('request');
        toast({
          title: "Paciente encontrado",
          description: `${patientData.name} - CPF: ${formatCPF(patientData.cpf)}`,
        });
      }
    },
    onError: (error: any) => {
      if (error.message === 'Paciente não encontrado') {
        setFoundPatient(null);
        setShowNewPatientForm(true);
        setCurrentStep('patient');
        toast({
          title: "Paciente não encontrado",
          description: "Preencha os dados para cadastrar um novo paciente",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na busca",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any): Promise<Patient> => {
      const response = await apiRequest('/api/patients', 'POST', patientData);
      return response.json();
    },
    onSuccess: (newPatient: Patient) => {
      setFoundPatient(newPatient);
      setShowNewPatientForm(false);
      setCurrentStep('request');
      toast({
        title: "Paciente cadastrado",
        description: `${newPatient.name} foi cadastrado com sucesso!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro ao cadastrar paciente",
        variant: "destructive",
      });
    }
  });

  // Update patient ID photos mutation
  const updatePatientPhotoMutation = useMutation({
    mutationFn: async ({ patientId, photoType, file }: { patientId: number, photoType: 'front' | 'back', file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', photoType);
      
      const response = await fetch(`/api/patients/${patientId}/upload-id-photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar foto');
      }
      
      return response.json();
    },
    onSuccess: (updatedPatient: Patient) => {
      setFoundPatient(updatedPatient);
      toast({
        title: "Foto atualizada",
        description: "Foto do documento atualizada com sucesso!",
      });
      setShowEditIdModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar foto",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any): Promise<{message: string; requests: any[]; count: number}> => {
      const response = await apiRequest('/api/requests', 'POST', requestData);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar requisição",
        variant: "destructive",
      });
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: number, comment: string }) => {
      return await apiRequest(`/api/requests/${requestId}`, 'PATCH', { comment });
    },
    onSuccess: () => {
      toast({
        title: "Comentário adicionado",
        description: "Comentário salvo com sucesso!",
      });
      setShowCommentModal(false);
      setRequestComment("");
      setSelectedRequestForComment(null);
      queryClient.invalidateQueries({ queryKey: [`/api/requests/user-recent/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message || "Erro ao salvar comentário",
        variant: "destructive",
      });
    }
  });



  const handleLogin = () => {
    if (loginForm.username && loginForm.password) {
      loginMutation.mutate(loginForm);
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear server session
      await fetch('/api/logout', {
        method: 'GET',
        credentials: 'include'
      });
    } catch (error) {
      console.log('Error during logout:', error);
    }
    
    // Clear local state
    setIsAuthenticated(false);
    setUser(null);
    setCurrentStep('login');
    resetForms();
  };

  const handleSearchPatient = () => {
    const cleanCpf = searchCpf.replace(/\D/g, '');
    
    // Check if CPF has 11 digits
    if (cleanCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve ter 11 dígitos",
        variant: "destructive",
      });
      return;
    }
    
    // Validate CPF using the validation function
    if (!isValidCPF(cleanCpf)) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido",
        variant: "destructive",
      });
      return;
    }
    
    searchPatientMutation.mutate(cleanCpf);
  };

  const calculateAge = (birthDate: string): number => {
    // Parse birthDate in DD/MM/YYYY format
    const [day, month, year] = birthDate.split('/').map(Number);
    
    if (!day || !month || !year || year < 1900 || year > new Date().getFullYear()) {
      return 0;
    }
    
    const birth = new Date(year, month - 1, day); // month is 0-indexed in Date
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleCreatePatient = () => {
    if (!patientForm.birthDate) {
      toast({
        title: "Data de nascimento obrigatória",
        description: "Por favor, informe a data de nascimento do paciente",
        variant: "destructive",
      });
      return;
    }

    // Validate birth date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(patientForm.birthDate)) {
      toast({
        title: "Data inválida",
        description: "Use o formato DD/MM/AAAA para a data de nascimento",
        variant: "destructive",
      });
      return;
    }

    const [day, month, year] = patientForm.birthDate.split('/').map(Number);
    
    // Validate date values
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
      toast({
        title: "Data inválida",
        description: "Verifique se a data está correta",
        variant: "destructive",
      });
      return;
    }

    const age = calculateAge(patientForm.birthDate);
    
    // Convert to ISO format for backend (YYYY-MM-DD)
    const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    const data = {
      ...patientForm,
      age: age,
      birthDate: isoDate,
      cpf: searchCpf.replace(/\D/g, ''),
    };
    createPatientMutation.mutate(data);
  };

  const handlePhotoUpload = (photoType: 'front' | 'back') => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.photoType = photoType;
      fileInputRef.current.click();
    }
  };

  // Validate attachment uploads before submission
  const validateAttachments = (): boolean => {
    const selectedExams = requestForm.examTypes;
    const selectedConsultations = requestForm.consultationTypes;
    
    if (selectedExams.length === 0 && selectedConsultations.length === 0) {
      toast({
        title: "Nenhum serviço selecionado",
        description: "Selecione pelo menos um exame ou consulta",
        variant: "destructive",
      });
      return false;
    }

    // Check if all selected services have attachments
    const missingAttachments = [];
    
    // Check exams
    for (const examId of selectedExams) {
      const key = `exam-${examId}`;
      if (!attachments[key]) {
        const exam = examTypes.find(e => e.id === examId);
        missingAttachments.push(exam?.name || `Exame ${examId}`);
      }
    }
    
    // Check consultations
    for (const consultationId of selectedConsultations) {
      const key = `consultation-${consultationId}`;
      if (!attachments[key]) {
        const consultation = consultationTypes.find(c => c.id === consultationId);
        missingAttachments.push(consultation?.name || `Consulta ${consultationId}`);
      }
    }

    if (missingAttachments.length > 0) {
      toast({
        title: "Anexos obrigatórios",
        description: `Os seguintes serviços precisam de anexos: ${missingAttachments.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Handle comment functionality
  const handleAddComment = (request: RequestWithRelations) => {
    setSelectedRequestForComment(request);
    setShowCommentModal(true);
  };

  const handleSaveComment = () => {
    if (selectedRequestForComment && requestComment.trim()) {
      addCommentMutation.mutate({ 
        requestId: selectedRequestForComment.id, 
        comment: requestComment 
      });
    }
  };

  // Create upload handler with status tracking
  const createUploadHandler = (attachmentKey: string) => {
    return async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Update attachment state
        setAttachments(prev => ({...prev, [attachmentKey]: file}));
        
        // Set upload status to uploading
        setUploadStatus(prev => ({...prev, [attachmentKey]: 'uploading'}));
        setUploadProgress(prev => ({...prev, [attachmentKey]: 0}));
        
        // Simulate upload process
        try {
          // Start upload progress simulation
          const interval = setInterval(() => {
            setUploadProgress(prev => {
              const current = prev[attachmentKey] || 0;
              if (current < 90) {
                return {...prev, [attachmentKey]: current + 10};
              }
              return prev;
            });
          }, 200);
          
          // Simulate upload completion after 2 seconds
          setTimeout(() => {
            clearInterval(interval);
            setUploadProgress(prev => ({...prev, [attachmentKey]: 100}));
            setUploadStatus(prev => ({...prev, [attachmentKey]: 'success'}));
          }, 2000);
        } catch (error) {
          setUploadStatus(prev => ({...prev, [attachmentKey]: 'error'}));
          toast({
            title: "Erro no upload",
            description: "Falha ao enviar arquivo",
            variant: "destructive",
          });
        }
      }
    };
  };



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const photoType = e.target.dataset.photoType as 'front' | 'back';
    
    if (file && foundPatient && photoType) {
      setUploading(photoType);
      uploadPhotoMutation.mutate({ patientId: foundPatient.id, file, photoType });
    }
  };

  const handleCreateRequest = async () => {
    if (!foundPatient) return;
    
    // Prevent multiple submissions
    if (isSubmitting || createRequestMutation.isPending) {
      return;
    }
    
    setIsSubmitting(true);
    
    const selectedExamTypes = requestForm.examTypes;
    const selectedConsultationTypes = requestForm.consultationTypes;
    
    if (selectedExamTypes.length === 0 && selectedConsultationTypes.length === 0) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione pelo menos um exame ou consulta",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate that all selected services have successful uploads
    if (!validateAttachments()) {
      setIsSubmitting(false);
      return;
    }



    // Check for duplicates in the last 30 days
    try {
      const duplicateResponse = await apiRequest('/api/requests/check-duplicates', 'POST', {
        patientId: foundPatient.id,
        examTypeIds: selectedExamTypes,
        consultationTypeIds: selectedConsultationTypes
      });
      
      const duplicatesData = await duplicateResponse.json();
      
      if (duplicatesData.duplicates && duplicatesData.duplicates.length > 0) {
        const duplicateNames = duplicatesData.duplicates.map((d: any) => d.name).join(', ');
        toast({
          title: "Requisição duplicada",
          description: `Este paciente já possui requisição(ões) para: ${duplicateNames} nos últimos 30 dias`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
      console.error('Error checking duplicates:', error);
      toast({
        title: "Erro ao verificar duplicatas",
        description: "Não foi possível verificar requisições duplicadas. Tente novamente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Use default values for mobile panel when healthUnit and doctor are not selected
    const defaultHealthUnitId = healthUnits.length > 0 ? healthUnits[0].id : 6; // Default to first available or UBS Central
    const defaultDoctorId = doctors.length > 0 ? doctors[0].id : user?.id || 1; // Default to first available or current user

    // Store current form data before creating request
    const currentAttachments = { ...attachments };

    try {
      // Create individual requests for each selected exam
      const examPromises = selectedExamTypes.map(async (examId) => {
        const examKey = `exam-${examId}`;
        const data = {
          patientId: foundPatient.id,
          doctorId: requestForm.doctorId ? parseInt(requestForm.doctorId) : defaultDoctorId,
          healthUnitId: requestForm.healthUnitId ? parseInt(requestForm.healthUnitId) : defaultHealthUnitId,
          examTypeIds: [examId],
          consultationTypeIds: [],
          isUrgent: itemUrgency[examKey] || false,
          notes: itemComments[examKey] || "",
        };
        
        const response = await apiRequest('/api/requests', 'POST', data);
        const result = await response.json();
        
        console.log(`🔍 Debug - Response from /api/requests:`, result);
        
        // Extract the first request from the requests array
        const createdRequest = result.requests && result.requests.length > 0 ? result.requests[0] : null;
        
        if (!createdRequest || !createdRequest.id) {
          console.error(`❌ ERRO CRÍTICO: ID da requisição não foi retornado. Response:`, result);
          throw new Error(`ID da requisição não foi retornado pelo servidor`);
        }
        
        // Upload attachment if present
        if (currentAttachments[examKey]) {
          try {
            const formData = new FormData();
            formData.append('attachment', currentAttachments[examKey]);
            const uploadResponse = await fetch(`/api/requests/${createdRequest.id}/upload-attachment`, {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error(`❌ Erro ao fazer upload de anexo para exame ${examKey}:`, errorText);
              
              // Delete the request if attachment upload fails
              await apiRequest(`/api/requests/${createdRequest.id}`, 'DELETE');
              throw new Error(`Erro ao fazer upload de anexo para exame: ${errorText}`);
            } else {
              console.log(`✅ Anexo enviado com sucesso para exame ${examKey} - Request ID: ${createdRequest.id}`);
            }
          } catch (attachmentError) {
            console.error(`❌ Erro crítico no upload de anexo para exame ${examKey}:`, attachmentError);
            
            // Try to delete the request if it was created
            try {
              await apiRequest(`/api/requests/${createdRequest.id}`, 'DELETE');
              console.log(`🗑️ Requisição ${createdRequest.id} deletada devido a falha no upload de anexo`);
            } catch (deleteError) {
              console.error(`❌ Erro ao deletar requisição ${createdRequest.id}:`, deleteError);
            }
            
            throw attachmentError;
          }
        }
        
        return createdRequest;
      });
      
      // Create individual requests for each selected consultation
      const consultationPromises = selectedConsultationTypes.map(async (consultationId) => {
        const consultationKey = `consultation-${consultationId}`;
        const data = {
          patientId: foundPatient.id,
          doctorId: requestForm.doctorId ? parseInt(requestForm.doctorId) : defaultDoctorId,
          healthUnitId: requestForm.healthUnitId ? parseInt(requestForm.healthUnitId) : defaultHealthUnitId,
          examTypeIds: [],
          consultationTypeIds: [consultationId],
          isUrgent: itemUrgency[consultationKey] || false,
          notes: itemComments[consultationKey] || "",
        };
        
        const response = await apiRequest('/api/requests', 'POST', data);
        const result = await response.json();
        
        console.log(`🔍 Debug - Response from /api/requests:`, result);
        
        // Extract the first request from the requests array
        const createdRequest = result.requests && result.requests.length > 0 ? result.requests[0] : null;
        
        if (!createdRequest || !createdRequest.id) {
          console.error(`❌ ERRO CRÍTICO: ID da requisição não foi retornado. Response:`, result);
          throw new Error(`ID da requisição não foi retornado pelo servidor`);
        }
        
        // Upload attachment if present
        if (currentAttachments[consultationKey]) {
          try {
            const formData = new FormData();
            formData.append('attachment', currentAttachments[consultationKey]);
            const uploadResponse = await fetch(`/api/requests/${createdRequest.id}/upload-attachment`, {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error(`❌ Erro ao fazer upload de anexo para consulta ${consultationKey}:`, errorText);
              
              // Delete the request if attachment upload fails
              await apiRequest(`/api/requests/${createdRequest.id}`, 'DELETE');
              throw new Error(`Erro ao fazer upload de anexo para consulta: ${errorText}`);
            } else {
              console.log(`✅ Anexo enviado com sucesso para consulta ${consultationKey} - Request ID: ${createdRequest.id}`);
            }
          } catch (attachmentError) {
            console.error(`❌ Erro crítico no upload de anexo para consulta ${consultationKey}:`, attachmentError);
            
            // Try to delete the request if it was created
            try {
              await apiRequest(`/api/requests/${createdRequest.id}`, 'DELETE');
              console.log(`🗑️ Requisição ${createdRequest.id} deletada devido a falha no upload de anexo`);
            } catch (deleteError) {
              console.error(`❌ Erro ao deletar requisição ${createdRequest.id}:`, deleteError);
            }
            
            throw attachmentError;
          }
        }
        
        return createdRequest;
      });
      
      // Wait for all requests to complete
      const allRequests = await Promise.all([...examPromises, ...consultationPromises]);
      
      console.log("✅ Todas as requisições criadas com sucesso:", allRequests.length);

      // Save data for confirmation page
      setConfirmationData({
        patient: foundPatient,
        createdRequests: allRequests,
        attachments: currentAttachments
      });
      
      // Show confirmation page
      setCurrentStep('confirmation');
      
    } catch (error: any) {
      console.error("Error in handleCreateRequest:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar requisição",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setSearchCpf("");
    setFoundPatient(null);
    setShowNewPatientForm(false);
    setPatientForm({
      name: "",
      socialName: "",
      cpf: "",
      birthDate: "",
      phone: "",
      address: ""
    });
    setRequestForm({
      examTypes: [],
      consultationTypes: [],
      isUrgent: false,
      observations: "",
      healthUnitId: "",
      doctorId: ""
    });
    setAttachments({}); // Clear all attachments
    setItemUrgency({}); // Clear individual urgency settings
    setItemComments({}); // Clear individual comments
    setUploadStatus({}); // Clear upload status
    setUploadProgress({}); // Clear upload progress
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-4 shadow-lg">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-6 w-6" />
              <div>
                <h1 className="text-lg font-bold">Painel Mobile UBS</h1>
                <p className="text-green-100 text-sm">
                  {isAuthenticated ? `${user?.firstName || user?.username}` : 'Área de Recepção'}
                </p>
                <p className="text-green-200 text-xs">
                  📱 Painel otimizado para dispositivos móveis
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentStep !== 'login' && currentStep !== 'search' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setCurrentStep('search');
                    resetForms();
                  }}
                  className="text-white hover:bg-green-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/'}
                className="text-white hover:bg-green-500"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              {isAuthenticated && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLogout}
                  className="text-white hover:bg-green-500"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-20">
        {/* Notification Banner - only show when authenticated */}
        {isAuthenticated && user && <NotificationBanner />}
        
        {/* Loading Screen - checking authentication */}
        {isCheckingAuth && (
          <Card className="shadow-lg">
            <CardContent className="py-8">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="text-gray-600">Verificando autenticação...</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Login Screen */}
        {!isCheckingAuth && currentStep === 'login' && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <LogIn className="h-5 w-5 text-blue-600" />
                <span>Login de Recepção</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  placeholder="Digite seu usuário"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <Button 
                onClick={handleLogin}
                disabled={!loginForm.username || !loginForm.password || loginMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="text-center pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = '/'}
                  className="text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Sistema
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Search Screen */}
        {currentStep === 'search' && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  <span>Buscar Paciente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="searchCpf">CPF do Paciente</Label>
                  <Input
                    id="searchCpf"
                    placeholder="000.000.000-00"
                    value={formatCPF(searchCpf)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 11) {
                        setSearchCpf(value);
                      }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                  />
                </div>

                <Button 
                  onClick={handleSearchPatient}
                  disabled={searchCpf.replace(/\D/g, '').length !== 11 || searchPatientMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {searchPatientMutation.isPending ? 'Buscando...' : 'Buscar Paciente'}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Requests Section */}
            {isAuthenticated && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Stethoscope className="h-5 w-5 text-green-600" />
                    <span>Últimas 5 Requisições</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userRecentRequests.length > 0 ? (
                    userRecentRequests.map((request: RequestWithRelations) => {
                    const hasAttachment = !!request.attachmentFileName;
                    const hasIdPhotos = !!(request.patient?.idPhotoFront && request.patient?.idPhotoBack);
                    const missingDocs = !hasAttachment || !hasIdPhotos;
                    
                    // Create array of missing documents for display
                    const missingDocsList = [];
                    if (!hasAttachment) missingDocsList.push('Anexo do exame/consulta');
                    if (!hasIdPhotos) missingDocsList.push('Fotos do RG');
                    
                    return (
                      <div 
                        key={request.id} 
                        className={`p-3 rounded-lg border-2 ${
                          missingDocs 
                            ? 'border-red-200 bg-red-50' 
                            : 'border-green-200 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">
                                #{request.id} - {request.patient?.name}
                              </span>
                              {missingDocs ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-600 mb-2">
                              Status: <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  request.status === 'suspenso' 
                                    ? 'border-red-500 text-red-600 bg-red-50' 
                                    : ''
                                }`}
                              >
                                {request.status === 'suspenso' ? 'Suspenso' : request.status}
                              </Badge>
                              {request.status === 'suspenso' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="ml-2 h-6 text-xs px-2 border-orange-300 text-orange-600 hover:bg-orange-100"
                                  onClick={async () => {
                                    try {
                                      const response = await apiRequest(`/api/requests/${request.id}/revert-suspended`, 'PATCH');
                                      
                                      if (response.ok) {
                                        toast({
                                          title: "Requisição corrigida",
                                          description: "Status alterado para 'Recebida'",
                                          variant: "default",
                                        });
                                        // Refresh the data
                                        queryClient.invalidateQueries({ queryKey: ['/api/requests/user-recent'] });
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "Erro",
                                        description: "Falha ao corrigir requisição",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Corrigido
                                </Button>
                              )}
                            </div>
                            
                            {/* Services */}
                            <div className="space-y-1">
                              {request.examType && (
                                <div className="text-xs">
                                  📋 {request.examType.name}
                                </div>
                              )}
                              {request.consultationType && (
                                <div className="text-xs">
                                  🏥 {request.consultationType.name}
                                </div>
                              )}
                            </div>
                            
                            {/* Missing documents alert with upload buttons */}
                            {missingDocs && (
                              <div className="mt-2 space-y-2">
                                <div className="text-xs font-medium text-red-600">Documentos em falta:</div>
                                {!hasIdPhotos && (
                                  <div className="flex items-center justify-between bg-red-50 p-2 rounded border border-red-200">
                                    <div className="text-xs text-red-600">• Fotos do RG (frente e verso)</div>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="h-6 text-xs px-2 border-red-300 text-red-600 hover:bg-red-100"
                                      onClick={() => {
                                        if (request.patient) {
                                          setSelectedPatientForEdit(request.patient as Patient);
                                          setShowEditPhotos(true);
                                        }
                                      }}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Enviar
                                    </Button>
                                  </div>
                                )}
                                {!hasAttachment && (
                                  <div className="flex items-center justify-between bg-red-50 p-2 rounded border border-red-200">
                                    <div className="text-xs text-red-600">• Anexo do exame/consulta</div>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="h-6 text-xs px-2 border-red-300 text-red-600 hover:bg-red-100"
                                      onClick={() => {
                                        setSelectedRequestForAttachment(request);
                                        setShowAttachmentUpload(true);
                                      }}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Enviar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Comment functionality */}
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                  Criado em: {new Date(request.createdAt || '').toLocaleDateString('pt-BR')}
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-6 text-xs px-2"
                                  onClick={() => handleAddComment(request)}
                                >
                                  💬 Comentar
                                </Button>
                              </div>
                              {request.notes && (
                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                  <strong>Comentário:</strong> {request.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })) : (
                    <div className="text-center py-4 text-gray-500">
                      {recentRequestsLoading ? (
                        <span>Carregando requisições...</span>
                      ) : recentRequestsError ? (
                        <span>Erro ao carregar requisições</span>
                      ) : (
                        <span>Nenhuma requisição encontrada</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Patient Registration Screen */}
        {currentStep === 'patient' && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <UserPlus className="h-5 w-5 text-green-600" />
                  <span>Cadastrar Paciente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    CPF {formatCPF(searchCpf)} não encontrado. Preencha os dados abaixo para cadastrar.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo do paciente"
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({...patientForm, name: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="socialName">Nome Social (opcional)</Label>
                  <Input
                    id="socialName"
                    placeholder="Nome social"
                    value={patientForm.socialName}
                    onChange={(e) => setPatientForm({...patientForm, socialName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento *</Label>
                    <Input
                      id="birthDate"
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={patientForm.birthDate}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 8) {
                          value = value.replace(/(\d{2})(\d)/, '$1/$2');
                          value = value.replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
                          setPatientForm({...patientForm, birthDate: value});
                        }
                      }}
                      maxLength={10}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(xx) 9xxxx-xxxx"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Endereço completo"
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                  />
                </div>

                <Button 
                  onClick={handleCreatePatient}
                  disabled={!patientForm.name || !patientForm.phone || !patientForm.birthDate || createPatientMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {createPatientMutation.isPending ? 'Cadastrando...' : 'Cadastrar Paciente'}
                </Button>
              </CardContent>
            </Card>

            {/* Patient Photo Upload Section */}
            {foundPatient && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-sm">Fotos do Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Front ID */}
                    <div className="text-center">
                      <Label className="text-sm">Frente do RG</Label>
                      <div className="mt-2">
                        {foundPatient.idPhotoFront ? (
                          <div className="relative">
                            <div className="w-full h-24 bg-green-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePhotoUpload('front')}
                              className="w-full mt-2"
                              disabled={uploading === 'front'}
                            >
                              {uploading === 'front' ? 'Enviando...' : 'Atualizar'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handlePhotoUpload('front')}
                            className="w-full h-24 border-dashed"
                            disabled={uploading === 'front'}
                          >
                            <div className="text-center">
                              <Camera className="h-6 w-6 mx-auto mb-1" />
                              <span className="text-xs">
                                {uploading === 'front' ? 'Enviando...' : 'Tirar Foto'}
                              </span>
                            </div>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Back ID */}
                    <div className="text-center">
                      <Label className="text-sm">Verso do RG</Label>
                      <div className="mt-2">
                        {foundPatient.idPhotoBack ? (
                          <div className="relative">
                            <div className="w-full h-24 bg-green-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePhotoUpload('back')}
                              className="w-full mt-2"
                              disabled={uploading === 'back'}
                            >
                              {uploading === 'back' ? 'Enviando...' : 'Atualizar'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handlePhotoUpload('back')}
                            className="w-full h-24 border-dashed"
                            disabled={uploading === 'back'}
                          >
                            <div className="text-center">
                              <Camera className="h-6 w-6 mx-auto mb-1" />
                              <span className="text-xs">
                                {uploading === 'back' ? 'Enviando...' : 'Tirar Foto'}
                              </span>
                            </div>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setCurrentStep('request')}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Continuar para Requisição
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Request Creation Screen */}
        {currentStep === 'request' && foundPatient && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span className="text-lg">{foundPatient.name}</span>
                </CardTitle>
                <p className="text-sm text-gray-600">CPF: {formatCPF(foundPatient.cpf)}</p>
                
                {/* Identity Photo Options */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowIdPhotoModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Ver Identidade
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditIdModal(true)}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Editar Fotos
                  </Button>
                </div>

                {/* Mandatory Photo Warning */}
                {!hasIdPhotos(foundPatient) && (
                  <Alert className="mt-3 border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Anexo obrigatório:</strong> É necessário anexar as fotos do documento de identidade (frente e verso) antes de prosseguir.
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditIdModal(true)}
                        className="ml-2 h-6 text-xs bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200"
                      >
                        Anexar Agora
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5 text-green-600" />
                  <span>Nova Requisição</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Exam Types */}
                <div>
                  <Label className="text-base font-medium">Tipos de Exames</Label>
                  
                  {/* Unified search for exams and consultations */}
                  <div className="mt-2 mb-3">
                    <Input
                      placeholder="Buscar exames e consultas..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {filteredExamTypes.sort((a, b) => a.name.localeCompare(b.name)).map((exam: ExamType) => {
                      const quotaStatus = getQuotaStatus(exam.name, 'exam');
                      const attachmentKey = `exam-${exam.id}`;
                      
                      return (
                        <div key={exam.id} className="p-2 border rounded">
                          <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <Checkbox
                                id={`exam-${exam.id}`}
                                checked={requestForm.examTypes.includes(exam.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setRequestForm({
                                      ...requestForm,
                                      examTypes: [...requestForm.examTypes, exam.id]
                                    });
                                  } else {
                                    setRequestForm({
                                      ...requestForm,
                                      examTypes: requestForm.examTypes.filter(id => id !== exam.id)
                                    });
                                    // Clear individual urgency and comments when unchecked
                                    const itemKey = `exam-${exam.id}`;
                                    setItemUrgency(prev => {
                                      const newUrgency = {...prev};
                                      delete newUrgency[itemKey];
                                      return newUrgency;
                                    });
                                    setItemComments(prev => {
                                      const newComments = {...prev};
                                      delete newComments[itemKey];
                                      return newComments;
                                    });
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`exam-${exam.id}`} className="text-base cursor-pointer">
                                  {exam.name}
                                </Label>
                                {/* Quota Status Detail */}
                                <div className="text-xs text-gray-600 mt-1">
                                  Cota: {quotaStatus.used}/{quotaStatus.quota} • 
                                  {quotaStatus.available ? (
                                    <span className="text-green-600 ml-1">
                                      {quotaStatus.remaining} disponíveis
                                    </span>
                                  ) : (
                                    <span className="text-red-600 ml-1">Esgotada</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!attachmentRefs.current[attachmentKey]) {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.pdf,.jpg,.jpeg,.png';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      setAttachments(prev => ({...prev, [attachmentKey]: file}));
                                    }
                                  };
                                  attachmentRefs.current[attachmentKey] = input;
                                }
                                attachmentRefs.current[attachmentKey].click();
                              }}
                            >
                              <Paperclip className="h-3 w-3" />
                              {attachments[attachmentKey] ? '✓' : ''}
                            </Button>
                          </div>
                          
                          {/* Exam Attachment Preview */}
                          {attachments[attachmentKey] && (
                            <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg shadow-sm">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <ImagePreview file={attachments[attachmentKey]} borderColor="blue" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-blue-900 truncate">
                                    📎 {attachments[attachmentKey].name}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    {(attachments[attachmentKey].size / 1024).toFixed(1)} KB • 
                                    <span className="text-green-600 ml-1">✓ Anexado</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {!quotaStatus.available && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Cota esgotada
                            </Badge>
                          )}
                          
                          {/* Individual urgency and comments for selected exam */}
                          {requestForm.examTypes.includes(exam.id) && (
                            <div className="mt-3 p-3 bg-gray-50 rounded border-t">
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`exam-urgent-${exam.id}`}
                                    checked={itemUrgency[`exam-${exam.id}`] || false}
                                    onCheckedChange={(checked) => 
                                      setItemUrgency(prev => ({...prev, [`exam-${exam.id}`]: !!checked}))
                                    }
                                  />
                                  <Label htmlFor={`exam-urgent-${exam.id}`} className="text-sm cursor-pointer text-red-600">
                                    🚨 Marcar como urgente
                                  </Label>
                                </div>
                                
                                <div>
                                  <Label htmlFor={`exam-comment-${exam.id}`} className="text-sm">Comentário:</Label>
                                  <Textarea
                                    id={`exam-comment-${exam.id}`}
                                    placeholder="Observações sobre este exame..."
                                    value={itemComments[`exam-${exam.id}`] || ""}
                                    onChange={(e) => 
                                      setItemComments(prev => ({...prev, [`exam-${exam.id}`]: e.target.value}))
                                    }
                                    rows={2}
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Consultation Types */}
                <div>
                  <Label className="text-base font-medium">Tipos de Consultas</Label>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {filteredConsultationTypes.sort((a, b) => a.name.localeCompare(b.name)).map((consultation: ConsultationType) => {
                      const quotaStatus = getQuotaStatus(consultation.name, 'consultation');
                      const attachmentKey = `consultation-${consultation.id}`;
                      
                      return (
                        <div key={consultation.id} className="p-2 border rounded">
                          <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <Checkbox
                                id={`consultation-${consultation.id}`}
                                checked={requestForm.consultationTypes.includes(consultation.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setRequestForm({
                                      ...requestForm,
                                      consultationTypes: [...requestForm.consultationTypes, consultation.id]
                                    });
                                  } else {
                                    setRequestForm({
                                      ...requestForm,
                                      consultationTypes: requestForm.consultationTypes.filter(id => id !== consultation.id)
                                    });
                                    // Clear individual urgency and comments when unchecked
                                    const itemKey = `consultation-${consultation.id}`;
                                    setItemUrgency(prev => {
                                      const newUrgency = {...prev};
                                      delete newUrgency[itemKey];
                                      return newUrgency;
                                    });
                                    setItemComments(prev => {
                                      const newComments = {...prev};
                                      delete newComments[itemKey];
                                      return newComments;
                                    });
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`consultation-${consultation.id}`} className="text-base cursor-pointer">
                                  {consultation.name}
                                </Label>
                                {/* Quota Status Detail */}
                                <div className="text-xs text-gray-600 mt-1">
                                  Cota: {quotaStatus.used}/{quotaStatus.quota} • 
                                  {quotaStatus.available ? (
                                    <span className="text-green-600 ml-1">
                                      {quotaStatus.remaining} disponíveis
                                    </span>
                                  ) : (
                                    <span className="text-red-600 ml-1">Esgotada</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!attachmentRefs.current[attachmentKey]) {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.pdf,.jpg,.jpeg,.png';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      setAttachments(prev => ({...prev, [attachmentKey]: file}));
                                    }
                                  };
                                  attachmentRefs.current[attachmentKey] = input;
                                }
                                attachmentRefs.current[attachmentKey].click();
                              }}
                            >
                              <Paperclip className="h-3 w-3" />
                              {attachments[attachmentKey] ? '✓' : ''}
                            </Button>
                          </div>
                          
                          {/* Consultation Attachment Preview */}
                          {attachments[attachmentKey] && (
                            <div className="mt-2 p-3 bg-green-50 border-2 border-green-200 rounded-lg shadow-sm">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <ImagePreview file={attachments[attachmentKey]} borderColor="green" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-green-900 truncate">
                                    📎 {attachments[attachmentKey].name}
                                  </div>
                                  <div className="text-xs text-green-600">
                                    {(attachments[attachmentKey].size / 1024).toFixed(1)} KB • 
                                    <span className="text-green-600 ml-1">✓ Anexado</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {!quotaStatus.available && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Cota esgotada
                            </Badge>
                          )}
                          
                          {/* Individual urgency and comments for selected consultation */}
                          {requestForm.consultationTypes.includes(consultation.id) && (
                            <div className="mt-3 p-3 bg-gray-50 rounded border-t">
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`consultation-urgent-${consultation.id}`}
                                    checked={itemUrgency[`consultation-${consultation.id}`] || false}
                                    onCheckedChange={(checked) => 
                                      setItemUrgency(prev => ({...prev, [`consultation-${consultation.id}`]: !!checked}))
                                    }
                                  />
                                  <Label htmlFor={`consultation-urgent-${consultation.id}`} className="text-sm cursor-pointer text-red-600">
                                    🚨 Marcar como urgente
                                  </Label>
                                </div>
                                
                                <div>
                                  <Label htmlFor={`consultation-comment-${consultation.id}`} className="text-sm">Comentário:</Label>
                                  <Textarea
                                    id={`consultation-comment-${consultation.id}`}
                                    placeholder="Observações sobre esta consulta..."
                                    value={itemComments[`consultation-${consultation.id}`] || ""}
                                    onChange={(e) => 
                                      setItemComments(prev => ({...prev, [`consultation-${consultation.id}`]: e.target.value}))
                                    }
                                    rows={2}
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>



                <Button 
                  onClick={handleCreateRequest}
                  disabled={
                    (requestForm.examTypes.length === 0 && requestForm.consultationTypes.length === 0) ||
                    !hasIdPhotos(foundPatient) ||
                    !allSelectedServicesHaveAttachments() ||
                    createRequestMutation.isPending ||
                    isSubmitting
                  }
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {createRequestMutation.isPending || isSubmitting ? 'Criando...' : 'Criar Requisição'}
                </Button>
                
                {/* Warning if ID photos missing */}
                {!hasIdPhotos(foundPatient) && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Anexe as fotos do documento de identidade antes de criar a requisição.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Warning if service attachments missing */}
                {(requestForm.examTypes.length > 0 || requestForm.consultationTypes.length > 0) && !allSelectedServicesHaveAttachments() && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      É obrigatório anexar documentos para todos os exames e consultas selecionados.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

        {/* Confirmation Screen */}
        {currentStep === 'confirmation' && confirmationData.patient && (
          <div className="space-y-6">
            <Card className="shadow-lg border-green-200">
              <CardHeader className="text-center bg-green-50">
                <CardTitle className="flex items-center justify-center space-x-2 text-green-700">
                  <CheckCircle className="h-6 w-6" />
                  <span>Cadastro Concluído com Sucesso!</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Patient Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Dados do Paciente</h3>
                  <div className="grid grid-cols-1 gap-3 bg-gray-50 p-4 rounded-lg">
                    <div><span className="font-medium">Nome:</span> {confirmationData.patient.name}</div>
                    {confirmationData.patient.socialName && (
                      <div><span className="font-medium">Apelido:</span> {confirmationData.patient.socialName}</div>
                    )}
                    <div><span className="font-medium">CPF:</span> {formatCPF(confirmationData.patient.cpf)}</div>
                    <div><span className="font-medium">Idade:</span> {confirmationData.patient.age} anos</div>
                    <div><span className="font-medium">Telefone:</span> {confirmationData.patient.phone}</div>
                    {confirmationData.patient.address && (
                      <div><span className="font-medium">Endereço:</span> {confirmationData.patient.address}</div>
                    )}
                  </div>
                </div>

                {/* Created Requests */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Requisições Criadas ({confirmationData.createdRequests.length})
                  </h3>
                  <div className="space-y-3">
                    {confirmationData.createdRequests.map((request, index) => {
                      const requestType = request.examTypeId ? examTypes?.find((e: any) => e.id === request.examTypeId) : consultationTypes?.find((c: any) => c.id === request.consultationTypeId);
                      const itemKey = request.examTypeId ? `exam-${request.examTypeId}` : `consultation-${request.consultationTypeId}`;
                      const hasAttachment = confirmationData.attachments[itemKey];
                      
                      return (
                        <div key={request.id} className="border rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="bg-white">
                                #{request.id}
                              </Badge>
                              <span className="font-medium text-blue-700">
                                {requestType?.name}
                              </span>
                            </div>
                            {hasAttachment && (
                              <Badge variant="default" className="bg-green-100 text-green-700">
                                <Paperclip className="h-3 w-3 mr-1" />
                                Anexo
                              </Badge>
                            )}
                          </div>
                          
                          {request.isUrgent && (
                            <Badge variant="destructive" className="mb-2">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              URGENTE
                            </Badge>
                          )}
                          
                          {request.notes && (
                            <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-100 rounded">
                              <strong>Comentário:</strong> {request.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Attached Photos Preview */}
                {Object.keys(confirmationData.attachments).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Documentos Anexados ({Object.keys(confirmationData.attachments).length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(confirmationData.attachments).map(([key, file]) => {
                        const requestType = key.startsWith('exam-') 
                          ? examTypes?.find((e: any) => e.id === parseInt(key.replace('exam-', '')))
                          : consultationTypes?.find((c: any) => c.id === parseInt(key.replace('consultation-', '')));
                        

                        return (
                          <div key={key} className="border rounded-lg p-3 bg-gray-50">
                            <div className="text-center space-y-2">
                              <div className="mx-auto">
                                <ImagePreview 
                                  file={file} 
                                  borderColor={key.startsWith('exam-') ? 'blue' : 'green'}
                                  size="large"
                                />
                              </div>
                              <div className="text-xs text-center">
                                <div className="font-medium text-gray-800 truncate">
                                  {requestType?.name}
                                </div>
                                <div className="text-gray-500 truncate">
                                  📎 {file.name}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  {(file.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col space-y-3 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Requisição criada",
                        description: "Requisições criadas com sucesso!",
                      });
                      resetForms();
                      setCurrentStep('search');
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Nova Requisição
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Voltar ao Sistema Principal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Identity Photo Viewing Modal */}
      <Dialog open={showIdPhotoModal} onOpenChange={setShowIdPhotoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Documento de Identidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Label className="text-sm font-medium">Frente do RG</Label>
                {foundPatient?.idPhotoFront ? (
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <img 
                      src={`/api/patients/${foundPatient.id}/id-photo/front`}
                      alt="Frente do RG"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                ) : (
                  <div className="mt-2 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Sem foto</span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <Label className="text-sm font-medium">Verso do RG</Label>
                {foundPatient?.idPhotoBack ? (
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <img 
                      src={`/api/patients/${foundPatient.id}/id-photo/back`}
                      alt="Verso do RG"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                ) : (
                  <div className="mt-2 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Sem foto</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Identity Photo Editing Modal */}
      <Dialog open={showEditIdModal} onOpenChange={setShowEditIdModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Fotos do Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Label className="text-sm font-medium">Frente do RG</Label>
                <div className="mt-2">
                  {foundPatient?.idPhotoFront ? (
                    <div className="border rounded-lg overflow-hidden mb-2">
                      <img 
                        src={`/api/patients/${foundPatient.id}/id-photo/front`}
                        alt="Frente atual"
                        className="w-full h-24 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-gray-500 text-xs">Sem foto</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file && foundPatient) {
                          updatePatientPhotoMutation.mutate({
                            patientId: foundPatient.id,
                            photoType: 'front',
                            file
                          });
                        }
                      };
                      input.click();
                    }}
                    disabled={updatePatientPhotoMutation.isPending}
                    className="w-full"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    {updatePatientPhotoMutation.isPending ? 'Enviando...' : 'Nova Foto'}
                  </Button>
                </div>
              </div>
              
              <div className="text-center">
                <Label className="text-sm font-medium">Verso do RG</Label>
                <div className="mt-2">
                  {foundPatient?.idPhotoBack ? (
                    <div className="border rounded-lg overflow-hidden mb-2">
                      <img 
                        src={`/api/patients/${foundPatient.id}/id-photo/back`}
                        alt="Verso atual"
                        className="w-full h-24 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-gray-500 text-xs">Sem foto</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file && foundPatient) {
                          updatePatientPhotoMutation.mutate({
                            patientId: foundPatient.id,
                            photoType: 'back',
                            file
                          });
                        }
                      };
                      input.click();
                    }}
                    disabled={updatePatientPhotoMutation.isPending}
                    className="w-full"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    {updatePatientPhotoMutation.isPending ? 'Enviando...' : 'Nova Foto'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Upload Modal */}
      <Dialog open={showAttachmentUpload} onOpenChange={setShowAttachmentUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Anexo da Requisição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequestForAttachment && (
              <div className="text-sm text-gray-600">
                <p><strong>Requisição:</strong> #{selectedRequestForAttachment.id}</p>
                <p><strong>Paciente:</strong> {selectedRequestForAttachment.patient?.name}</p>
                {selectedRequestForAttachment.examType && (
                  <p><strong>Exame:</strong> {selectedRequestForAttachment.examType.name}</p>
                )}
                {selectedRequestForAttachment.consultationType && (
                  <p><strong>Consulta:</strong> {selectedRequestForAttachment.consultationType.name}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Selecionar arquivo (PDF, imagem)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && selectedRequestForAttachment) {
                    const formData = new FormData();
                    formData.append('attachment', file);
                    
                    try {
                      console.log('📎 Enviando anexo para requisição:', selectedRequestForAttachment.id);
                      const response = await fetch(`/api/requests/${selectedRequestForAttachment.id}/upload-attachment`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                      });
                      console.log('📎 Resposta do upload:', response.status, response.ok);
                      
                      if (response.ok) {
                        // Invalidate multiple cache keys to ensure updates
                        await queryClient.invalidateQueries({ queryKey: [`/api/requests/user-recent/${user?.id}`] });
                        await queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
                        
                        // Force refetch of the user recent requests
                        await queryClient.refetchQueries({ queryKey: [`/api/requests/user-recent/${user?.id}`] });
                        
                        setShowAttachmentUpload(false);
                        setSelectedRequestForAttachment(null);
                        toast({
                          title: "Anexo enviado",
                          description: "Documento anexado com sucesso!",
                        });
                      } else {
                        throw new Error('Erro ao enviar anexo');
                      }
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Falha ao enviar anexo. Tente novamente.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Comentário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequestForComment && (
              <div className="text-sm text-gray-600">
                <p><strong>Requisição:</strong> #{selectedRequestForComment.id}</p>
                <p><strong>Paciente:</strong> {selectedRequestForComment.patient?.name}</p>
                {selectedRequestForComment.examType && (
                  <p><strong>Exame:</strong> {selectedRequestForComment.examType.name}</p>
                )}
                {selectedRequestForComment.consultationType && (
                  <p><strong>Consulta:</strong> {selectedRequestForComment.consultationType.name}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="comment">Comentário</Label>
              <Textarea
                id="comment"
                placeholder="Digite seu comentário sobre esta requisição..."
                value={requestComment}
                onChange={(e) => setRequestComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveComment}
                disabled={addCommentMutation.isPending || !requestComment.trim()}
                className="flex-1"
              >
                {addCommentMutation.isPending ? "Salvando..." : "Salvar Comentário"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCommentModal(false);
                  setRequestComment("");
                  setSelectedRequestForComment(null);
                }}
                disabled={addCommentMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}