import { useState, useEffect } from "react";
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
import { 
  FileText, 
  Camera, 
  Upload, 
  Search, 
  User, 
  Edit, 
  XCircle, 
  CheckCircle,
  AlertTriangle,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  LogOut,
  Stethoscope,
  UserPlus,
  Save,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface Patient {
  id: number;
  name: string;
  socialName?: string;
  cpf: string;
  age: number;
  phone: string;
  birthDate?: string;
  address?: string;
  city?: string;
  state?: string;
  idPhotoFront?: string;
  idPhotoBack?: string;
}

interface Request {
  id: number;
  status: string;
  isUrgent: boolean;
  attachmentFileName?: string;
  additionalDocumentFileName?: string;
  examType?: { name: string };
  consultationType?: { name: string };
  createdAt: string;
}

export default function MobileDocumentPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<'search' | 'patient' | 'request'>('search');
  const [cpf, setCpf] = useState("");
  const [searchCpf, setSearchCpf] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  
  // Form states
  const [patientForm, setPatientForm] = useState({
    name: "",
    socialName: "",
    cpf: "",
    age: "",
    phone: "",
    birthDate: "",
    address: "",
    city: "",
    state: "",
  });

  const [requestForm, setRequestForm] = useState({
    patientCpf: "",
    patientName: "",
    patientAge: "",
    patientPhone: "",
    patientSocialName: "",
    patientAddress: "",
    patientCity: "",
    patientState: "",
    patientBirthDate: "",
    patientNotes: "",
    doctorId: "",
    healthUnitId: "",
    examTypes: [] as number[],
    consultationTypes: [] as number[],
    isUrgent: false,
    observations: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-bold">Acesso Restrito</h2>
              <p className="text-gray-600">
                Esta página é exclusiva para atendentes de recepção. 
                Faça login para acessar o sistema de requisições.
              </p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Fazer Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check user role
  if ((user as any)?.role !== 'recepcao') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-bold">Acesso Negado</h2>
              <p className="text-gray-600">
                Esta página é exclusiva para atendentes de recepção da UBS.
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                Voltar à Página Inicial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch patient by CPF
  const { data: patientData, isLoading: isLoadingPatient, error } = useQuery({
    queryKey: [`/api/patients/by-cpf/${searchCpf}`],
    enabled: !!searchCpf,
    queryFn: async () => {
      const res = await fetch(`/api/patients/by-cpf/${searchCpf}`, {
        credentials: "include",
      });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
  });

  // Fetch dropdown data - enabled for reception users
  const { data: healthUnits } = useQuery({
    queryKey: ["/api/health-units"],
    enabled: isAuthenticated && (user as any)?.role === 'recepcao',
  });

  const { data: examTypes } = useQuery({
    queryKey: ["/api/exam-types"],
    enabled: isAuthenticated && (user as any)?.role === 'recepcao',
  });

  const { data: consultationTypes } = useQuery({
    queryKey: ["/api/consultation-types"],
    enabled: isAuthenticated && (user as any)?.role === 'recepcao',
  });

  const { data: doctors } = useQuery({
    queryKey: ["/api/users?role=recepcao"],
    enabled: isAuthenticated && (user as any)?.role === 'recepcao',
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/patients", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Paciente cadastrado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/by-cpf/${searchCpf}`] });
      setShowNewPatientForm(false);
      resetForms();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar paciente",
        variant: "destructive",
      });
    }
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

  // Helper functions
  const resetForms = () => {
    setPatientForm({
      name: "",
      socialName: "",
      cpf: "",
      age: "",
      phone: "",
      birthDate: "",
      address: "",
      city: "",
      state: "",
    });
    setRequestForm({
      patientCpf: "",
      patientName: "",
      patientAge: "",
      patientPhone: "",
      patientSocialName: "",
      patientAddress: "",
      patientCity: "",
      patientState: "",
      patientBirthDate: "",
      patientNotes: "",
      doctorId: "",
      healthUnitId: "",
      examTypes: [],
      consultationTypes: [],
      isUrgent: false,
      observations: "",
    });
    setCpf("");
    setSearchCpf("");
    setSelectedPatient(null);
  };

  // Handle patient search
  const handlePatientSearch = () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, informe um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }
    setSearchCpf(cleanCpf);
  };

  // Handle patient found
  useEffect(() => {
    if (patientData && searchCpf) {
      setSelectedPatient(patientData);
      setRequestForm(prev => ({
        ...prev,
        patientCpf: patientData.cpf,
        patientName: patientData.name,
        patientAge: patientData.age.toString(),
        patientPhone: patientData.phone,
        patientSocialName: patientData.socialName || "",
        patientAddress: patientData.address || "",
        patientCity: patientData.city || "",
        patientState: patientData.state || "",
        patientBirthDate: patientData.birthDate ? patientData.birthDate.split('T')[0] : "",
      }));
      setCurrentStep('request');
    } else if (searchCpf && !isLoadingPatient && !patientData) {
      setShowNewPatientForm(true);
      setPatientForm(prev => ({ ...prev, cpf: searchCpf }));
    }
  }, [patientData, searchCpf, isLoadingPatient]);

  // Handle new patient creation
  const handleCreatePatient = () => {
    const data = {
      ...patientForm,
      age: parseInt(patientForm.age),
      birthDate: patientForm.birthDate ? new Date(patientForm.birthDate) : undefined,
    };
    createPatientMutation.mutate(data);
  };

  // Handle request creation
  const handleCreateRequest = () => {
    if (requestForm.examTypes.length === 0 && requestForm.consultationTypes.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um exame ou consulta.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      ...requestForm,
      patientAge: parseInt(requestForm.patientAge),
      patientBirthDate: requestForm.patientBirthDate ? new Date(requestForm.patientBirthDate) : undefined,
      doctorId: parseInt(requestForm.doctorId),
      healthUnitId: parseInt(requestForm.healthUnitId),
    };
    createRequestMutation.mutate(data);
  };

  // Handle logout
  const handleLogout = () => {
    window.location.href = '/api/logout';
  };



  // Format CPF
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  // Handle CPF input
  const handleCpfChange = (value: string) => {
    const formatted = formatCpf(value);
    setCpf(formatted);
  };

  // Handle search
  const handleSearch = () => {
    if (!cpf.trim()) {
      toast({
        title: "CPF obrigatório",
        description: "Por favor, informe um CPF para consulta.",
        variant: "destructive",
      });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, informe um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setSearchCpf(cleanCpf);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">Painel de Requisições</h1>
              <p className="text-xs text-green-100">Atendente: {(user as any)?.username}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-green-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Step 1: Search Patient */}
        {currentStep === 'search' && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar Paciente por CPF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="cpf" className="text-sm">CPF do Paciente</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  maxLength={14}
                  className="text-center text-lg font-mono"
                />
              </div>
              <Button 
                onClick={handlePatientSearch}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoadingPatient}
              >
                {isLoadingPatient ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar Paciente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* New Patient Form Dialog */}
        <Dialog open={showNewPatientForm} onOpenChange={setShowNewPatientForm}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome Completo *</Label>
                  <Input
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({...patientForm, name: e.target.value})}
                    placeholder="Nome completo"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Apelido</Label>
                  <Input
                    value={patientForm.socialName}
                    onChange={(e) => setPatientForm({...patientForm, socialName: e.target.value})}
                    placeholder="Como prefere ser chamado"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">CPF *</Label>
                  <Input
                    value={formatCpf(patientForm.cpf)}
                    onChange={(e) => setPatientForm({...patientForm, cpf: e.target.value.replace(/\D/g, '')})}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="text-sm font-mono"
                    disabled
                  />
                </div>
                <div>
                  <Label className="text-xs">Idade *</Label>
                  <Input
                    type="number"
                    value={patientForm.age}
                    onChange={(e) => setPatientForm({...patientForm, age: e.target.value})}
                    placeholder="Idade"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={patientForm.birthDate}
                    onChange={(e) => setPatientForm({...patientForm, birthDate: e.target.value})}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Endereço</Label>
                <Input
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                  placeholder="Rua, número, bairro"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    value={patientForm.city}
                    onChange={(e) => setPatientForm({...patientForm, city: e.target.value})}
                    placeholder="Cidade"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Input
                    value={patientForm.state}
                    onChange={(e) => setPatientForm({...patientForm, state: e.target.value})}
                    placeholder="UF"
                    maxLength={2}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewPatientForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreatePatient}
                  disabled={createPatientMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createPatientMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Cadastrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Step 2: Request Form */}
        {currentStep === 'request' && selectedPatient && (
          <>
            {/* Patient Info */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Paciente Selecionado
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentStep('search');
                      resetForms();
                    }}
                    className="ml-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Nome:</span>
                    <span className="font-medium text-sm">{selectedPatient.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">CPF:</span>
                    <span className="font-mono text-sm">{formatCpf(selectedPatient.cpf)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Idade:</span>
                    <span className="text-sm">{selectedPatient.age} anos</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Request Form */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Nova Requisição
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Doctor and Health Unit */}
                <div className="grid grid-cols-1 gap-3">
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
                        {(healthUnits || []).map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>
                            {unit.name}
                          </SelectItem>
                        ))}
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
                        {(doctors || []).map((doctor: any) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            {doctor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Exam Types */}
                <div>
                  <Label className="text-sm font-medium">Tipos de Exames</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto">
                    {(examTypes || []).map((exam: any) => (
                      <div key={exam.id} className="flex items-center space-x-2">
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
                    ))}
                  </div>
                </div>

                {/* Consultation Types */}
                <div>
                  <Label className="text-sm font-medium">Tipos de Consultas</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto">
                    {(consultationTypes || []).map((consultation: any) => (
                      <div key={consultation.id} className="flex items-center space-x-2">
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
                    ))}
                  </div>
                </div>

                {/* Urgent checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="urgent"
                    checked={requestForm.isUrgent}
                    onCheckedChange={(checked) => setRequestForm({...requestForm, isUrgent: !!checked})}
                  />
                  <Label htmlFor="urgent" className="text-sm cursor-pointer text-red-600 font-medium">
                    Marcar como URGENTE
                  </Label>
                </div>

                {/* Observations */}
                <div>
                  <Label className="text-sm">Observações</Label>
                  <Textarea
                    value={requestForm.observations}
                    onChange={(e) => setRequestForm({...requestForm, observations: e.target.value})}
                    placeholder="Observações adicionais..."
                    className="text-sm"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleCreateRequest}
                  disabled={createRequestMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {createRequestMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Criar Requisição
                </Button>
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </div>
  );
}