import { useState, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Smartphone, 
  LogIn,
  LogOut,
  Search, 
  User, 
  UserPlus,
  ArrowLeft,
  Stethoscope,
  Camera,
  Upload,
  FileText,
  Eye,
  Save,
  CheckCircle,
  AlertTriangle,
  Phone,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  idPhotoFront?: string;
  idPhotoBack?: string;
}

export default function CompleteMobilePanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<'login' | 'search' | 'patient' | 'request'>('login');
  
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
    age: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    birthDate: ""
  });
  
  // Request form
  const [requestForm, setRequestForm] = useState({
    examTypes: [] as number[],
    consultationTypes: [] as number[],
    isUrgent: false,
    observations: "",
    healthUnitId: "",
    doctorId: "",
    requestPhoto: null as File | null
  });
  
  // File uploads
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestPhotoRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dropdown data
  const { data: healthUnits } = useQuery({
    queryKey: ["/api/health-units"],
    enabled: isAuthenticated,
  });

  const { data: examTypes } = useQuery({
    queryKey: ["/api/exam-types"],
    enabled: isAuthenticated,
  });

  const { data: consultationTypes } = useQuery({
    queryKey: ["/api/consultation-types"],
    enabled: isAuthenticated,
  });

  const { data: doctors } = useQuery({
    queryKey: ["/api/users?role=recepcao"],
    enabled: isAuthenticated,
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
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Erro ao buscar paciente');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.patient) {
        setFoundPatient(data.patient);
        setCurrentStep('patient');
      } else {
        setFoundPatient(null);
        setShowNewPatientForm(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro na busca",
        description: error.message || "Erro ao buscar paciente",
        variant: "destructive",
      });
    }
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/patients", "POST", data);
    },
    onSuccess: (patient) => {
      setFoundPatient(patient);
      setShowNewPatientForm(false);
      setCurrentStep('patient');
      toast({
        title: "Sucesso",
        description: "Paciente cadastrado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar paciente",
        variant: "destructive",
      });
    }
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ patientId, file, photoType }: { patientId: number; file: File; photoType: 'front' | 'back' }) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', photoType);

      const response = await fetch(`/api/patients/${patientId}/upload-id-photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload da foto');
      }

      return response.json();
    },
    onSuccess: () => {
      setUploading(null);
      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso!",
      });
      // Refresh patient data
      if (foundPatient) {
        const cleanCpf = foundPatient.cpf.replace(/\D/g, '');
        searchPatientMutation.mutate(cleanCpf);
      }
    },
    onError: (error: any) => {
      setUploading(null);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar documento",
        variant: "destructive",
      });
    },
  });

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/requests", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Requisição criada com sucesso!",
      });
      resetForms();
      setCurrentStep('search');
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar requisição",
        variant: "destructive",
      });
    }
  });

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleLogin = () => {
    if (loginForm.username && loginForm.password) {
      loginMutation.mutate(loginForm);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentStep('login');
    resetForms();
  };

  const handleSearchPatient = () => {
    const cleanCpf = searchCpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      searchPatientMutation.mutate(cleanCpf);
    }
  };

  const handleCreatePatient = () => {
    const data = {
      ...patientForm,
      age: parseInt(patientForm.age),
      cpf: searchCpf.replace(/\D/g, ''),
      birthDate: patientForm.birthDate ? new Date(patientForm.birthDate) : undefined,
    };
    createPatientMutation.mutate(data);
  };

  const handlePhotoUpload = (photoType: 'front' | 'back') => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.photoType = photoType;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const photoType = e.target.dataset.photoType as 'front' | 'back';
    
    if (file && foundPatient && photoType) {
      setUploading(photoType);
      uploadPhotoMutation.mutate({ patientId: foundPatient.id, file, photoType });
    }
  };

  const handleRequestPhotoUpload = () => {
    if (requestPhotoRef.current) {
      requestPhotoRef.current.click();
    }
  };

  const handleRequestPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRequestForm({ ...requestForm, requestPhoto: file });
      toast({
        title: "Foto anexada",
        description: "Foto da solicitação anexada com sucesso!",
      });
    }
  };

  const handleCreateRequest = () => {
    if (!foundPatient) return;
    
    const selectedExamTypes = requestForm.examTypes;
    const selectedConsultationTypes = requestForm.consultationTypes;
    
    if (selectedExamTypes.length === 0 && selectedConsultationTypes.length === 0) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione pelo menos um exame ou consulta",
        variant: "destructive",
      });
      return;
    }

    const data = {
      patientId: foundPatient.id,
      doctorId: parseInt(requestForm.doctorId),
      healthUnitId: parseInt(requestForm.healthUnitId),
      examTypeIds: selectedExamTypes,
      consultationTypeIds: selectedConsultationTypes,
      isUrgent: requestForm.isUrgent,
      notes: requestForm.observations || undefined,
    };

    createRequestMutation.mutate(data);
  };

  const resetForms = () => {
    setSearchCpf("");
    setFoundPatient(null);
    setShowNewPatientForm(false);
    setPatientForm({
      name: "",
      socialName: "",
      cpf: "",
      age: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      birthDate: ""
    });
    setRequestForm({
      examTypes: [],
      consultationTypes: [],
      isUrgent: false,
      observations: "",
      healthUnitId: "",
      doctorId: "",
      requestPhoto: null
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentStep !== 'login' && currentStep !== 'search' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentStep('search')}
                  className="text-white hover:bg-green-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
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

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Login Screen */}
        {currentStep === 'login' && (
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
                  Voltar à Página Inicial
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Patient Screen */}
        {currentStep === 'search' && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span>Buscar Paciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search-cpf">CPF do Paciente</Label>
                <Input
                  id="search-cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={searchCpf}
                  onChange={(e) => setSearchCpf(formatCPF(e.target.value))}
                  maxLength={14}
                  className="text-center text-lg"
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
        )}

        {/* New Patient Form */}
        {showNewPatientForm && (
          <Card className="shadow-lg mt-4">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                <span>Cadastrar Novo Paciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Paciente não encontrado. Preencha os dados para cadastro.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome completo"
                  value={patientForm.name}
                  onChange={(e) => setPatientForm({...patientForm, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="social-name">Nome Social</Label>
                <Input
                  id="social-name"
                  placeholder="Nome social (opcional)"
                  value={patientForm.socialName}
                  onChange={(e) => setPatientForm({...patientForm, socialName: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Idade"
                  value={patientForm.age}
                  onChange={(e) => setPatientForm({...patientForm, age: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Rua, número, bairro"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewPatientForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreatePatient}
                  disabled={!patientForm.name || !patientForm.phone || createPatientMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {createPatientMutation.isPending ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Details and Documents */}
        {currentStep === 'patient' && foundPatient && (
          <div className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Dados do Paciente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <p><strong>Nome:</strong> {foundPatient.name}</p>
                  {foundPatient.socialName && (
                    <p><strong>Nome Social:</strong> {foundPatient.socialName}</p>
                  )}
                  <p><strong>CPF:</strong> {formatCPF(foundPatient.cpf)}</p>
                  <p><strong>Idade:</strong> {foundPatient.age} anos</p>
                  <p><strong>Telefone:</strong> {foundPatient.phone}</p>
                  {foundPatient.address && (
                    <p><strong>Endereço:</strong> {foundPatient.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-purple-600" />
                  <span>Documentos de Identidade</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Criar Nova Requisição
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Request Creation */}
        {currentStep === 'request' && foundPatient && (
          <div className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5 text-green-600" />
                  <span>Nova Requisição</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm">Unidade de Saúde *</Label>
                    <Select
                      value={requestForm.healthUnitId}
                      onValueChange={(value) => setRequestForm({...requestForm, healthUnitId: value})}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(healthUnits) ? healthUnits.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>
                            {unit.name}
                          </SelectItem>
                        )) : []}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Médico/Profissional *</Label>
                    <Select
                      value={requestForm.doctorId}
                      onValueChange={(value) => setRequestForm({...requestForm, doctorId: value})}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione o médico" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(doctors) ? doctors.map((doctor: any) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            {doctor.firstName || doctor.username}
                          </SelectItem>
                        )) : []}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Exam Types */}
                <div>
                  <Label className="text-sm font-medium">Tipos de Exames</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto">
                    {Array.isArray(examTypes) ? examTypes.map((exam: any) => (
                      <div key={exam.id} className="flex items-center justify-between space-x-2 p-2 border rounded">
                        <div className="flex items-center space-x-2">
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
                              }
                            }}
                          />
                          <Label htmlFor={`exam-${exam.id}`} className="text-sm cursor-pointer">
                            {exam.name}
                          </Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Quota: {exam.monthlyQuota || 'Sem limite'}
                        </Badge>
                      </div>
                    )) : []}
                  </div>
                </div>

                {/* Consultation Types */}
                <div>
                  <Label className="text-sm font-medium">Tipos de Consultas</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto">
                    {Array.isArray(consultationTypes) ? consultationTypes.map((consultation: any) => (
                      <div key={consultation.id} className="flex items-center justify-between space-x-2 p-2 border rounded">
                        <div className="flex items-center space-x-2">
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
                              }
                            }}
                          />
                          <Label htmlFor={`consultation-${consultation.id}`} className="text-sm cursor-pointer">
                            {consultation.name}
                          </Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Quota: {consultation.monthlyQuota || 'Sem limite'}
                        </Badge>
                      </div>
                    )) : []}
                  </div>
                </div>

                {/* Request Photo */}
                <div>
                  <Label className="text-sm font-medium">Foto da Solicitação</Label>
                  <div className="mt-2">
                    {requestForm.requestPhoto ? (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-700">Foto anexada</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRequestPhotoUpload}
                        >
                          Alterar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleRequestPhotoUpload}
                        className="w-full border-dashed"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Anexar Foto da Solicitação
                      </Button>
                    )}
                  </div>
                </div>

                {/* Urgency and Observations */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="urgent"
                      checked={requestForm.isUrgent}
                      onCheckedChange={(checked) => setRequestForm({...requestForm, isUrgent: !!checked})}
                    />
                    <Label htmlFor="urgent" className="text-sm cursor-pointer">
                      Marcar como urgente
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      placeholder="Observações adicionais..."
                      value={requestForm.observations}
                      onChange={(e) => setRequestForm({...requestForm, observations: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateRequest}
                  disabled={
                    !requestForm.healthUnitId || 
                    !requestForm.doctorId || 
                    (requestForm.examTypes.length === 0 && requestForm.consultationTypes.length === 0) ||
                    createRequestMutation.isPending
                  }
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {createRequestMutation.isPending ? 'Criando...' : 'Criar Requisição'}
                </Button>
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
      
      <input
        ref={requestPhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleRequestPhotoChange}
        className="hidden"
      />
    </div>
  );
}