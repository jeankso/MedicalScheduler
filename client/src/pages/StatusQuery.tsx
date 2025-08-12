import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, FileText, Calendar, User, MapPin, LogIn, Edit, Upload, AlertTriangle, CheckCircle, XCircle, Clock, Download, Eye, Paperclip } from "lucide-react";
import type { RequestWithRelations } from "@shared/schema";

interface Patient {
  id: number;
  name: string;
  socialName?: string;
  cpf: string;
  address?: string;
  city?: string;
  state?: string;
  age: number;
  phone: string;
  birthDate?: string;
}

type Request = RequestWithRelations;

export default function StatusQuery() {
  const [cpf, setCpf] = useState("");
  const [searchCpf, setSearchCpf] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    socialName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  const [uploadingPhoto, setUploadingPhoto] = useState<{patientId: number, type: 'front' | 'back'} | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingAdditionalDoc, setUploadingAdditionalDoc] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const [registerForm, setRegisterForm] = useState({
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

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patient and requests by CPF
  const { data: patientData, isLoading, error } = useQuery({
    queryKey: [`/api/patients/search-by-cpf/${searchCpf}`],
    enabled: !!searchCpf,
    queryFn: async () => {
      const res = await fetch(`/api/patients/search-by-cpf/${searchCpf}`, {
        credentials: "include",
      });

      if (res.status === 404) {
        return null; // Patient not found - this will be handled as no data
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/patients/${patientData?.patient?.id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Informações do paciente atualizadas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/search-by-cpf/${searchCpf}`] });
      setShowEditModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar informações do paciente",
        variant: "destructive",
      });
    },
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
      queryClient.invalidateQueries({ queryKey: [`/api/patients/search-by-cpf/${searchCpf}`] });
      setShowRegisterForm(false);
      setRegisterForm({
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
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar paciente",
        variant: "destructive",
      });
    },
  });

  // Upload ID photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ patientId, file, photoType }: { patientId: number; file: File; photoType: 'front' | 'back' }) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', photoType);

      const response = await fetch(`/api/patients/${patientId}/upload-id-photo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload da foto');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Foto Enviada",
        description: "A foto da identidade foi salva com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/search-by-cpf/${searchCpf}`] });
      setUploadingPhoto(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao fazer upload da foto.",
        variant: "destructive",
      });
      setUploadingPhoto(null);
    },
  });

  // Delete ID photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async ({ patientId, photoType }: { patientId: number; photoType: 'front' | 'back' }) => {
      const response = await fetch(`/api/patients/${patientId}/delete-id-photo/${photoType}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao remover foto');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Foto Removida",
        description: "A foto foi removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/search-by-cpf/${searchCpf}`] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover a foto.",
        variant: "destructive",
      });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ requestId, file }: { requestId: number; file: File }) => {
      console.log('Iniciando upload - Request ID:', requestId, 'File:', file.name);
      
      const formData = new FormData();
      formData.append('attachment', file);

      const response = await fetch(`/api/requests/${requestId}/upload-attachment-public`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('Response status:', response.status, 'OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: 'Erro de comunicação com o servidor' };
        }
        
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Upload response data:', responseData);
      return responseData;
    },
    onSuccess: (data) => {
      console.log('Upload success callback triggered with data:', data);
      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso!",
      });
      setUploadingDoc(false);
      queryClient.invalidateQueries({ queryKey: [`/api/patients/search-by-cpf/${searchCpf}`] });
    },
    onError: (error: Error) => {
      console.log('Upload error callback triggered:', error);
      toast({
        title: "Erro no Upload",
        description: error.message || "Falha ao enviar documento.",
        variant: "destructive",
      });
      setUploadingDoc(false);
    },
  });

  // Upload additional document mutation
  const uploadAdditionalDocMutation = useMutation({
    mutationFn: async ({ requestId, file }: { requestId: number; file: File }) => {
      console.log('Iniciando upload adicional - Request ID:', requestId, 'File:', file.name);
      
      const formData = new FormData();
      formData.append('additionalDocument', file);

      const response = await fetch(`/api/requests/${requestId}/upload-additional-document`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('Additional doc response status:', response.status, 'OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Additional doc error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: 'Erro de comunicação com o servidor' };
        }
        
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Additional doc upload response data:', responseData);
      return responseData;
    },
    onSuccess: (data) => {
      console.log('Additional doc upload success callback triggered with data:', data);
      toast({
        title: "Sucesso",
        description: "Documento adicional enviado com sucesso!",
      });
      setUploadingAdditionalDoc(false);
      queryClient.invalidateQueries({ queryKey: [`/api/patients/search-by-cpf/${searchCpf}`] });
    },
    onError: (error: Error) => {
      console.log('Additional doc upload error callback triggered:', error);
      toast({
        title: "Erro no Upload",
        description: error.message || "Falha ao enviar documento adicional.",
        variant: "destructive",
      });
      setUploadingAdditionalDoc(false);
    },
  });

  // Handle document upload
  const handleDocumentUpload = (requestId: number, file: File) => {
    console.log('Iniciando upload de documento:', { requestId, fileName: file.name, fileSize: file.size, fileType: file.type });
    setUploadingDoc(true);
    
    // Add extra logging for the mutation
    console.log('Calling uploadDocumentMutation.mutate...');
    uploadDocumentMutation.mutate({ requestId, file });
    console.log('uploadDocumentMutation.mutate called, mutation status:', {
      isError: uploadDocumentMutation.isError,
      isPending: uploadDocumentMutation.isPending,
      isSuccess: uploadDocumentMutation.isSuccess
    });
  };

  // Handle additional document upload
  const handleAdditionalDocumentUpload = (requestId: number, file: File) => {
    console.log('Iniciando upload de documento adicional:', { requestId, fileName: file.name, fileSize: file.size, fileType: file.type });
    setUploadingAdditionalDoc(true);
    
    // Add extra logging for the mutation
    console.log('Calling uploadAdditionalDocMutation.mutate...');
    uploadAdditionalDocMutation.mutate({ requestId, file });
    console.log('uploadAdditionalDocMutation.mutate called, mutation status:', {
      isError: uploadAdditionalDocMutation.isError,
      isPending: uploadAdditionalDocMutation.isPending,
      isSuccess: uploadAdditionalDocMutation.isSuccess
    });
  };

  // Trigger file input programmatically
  const triggerFileInput = (requestId: number, type: 'attachment' | 'additional') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'attachment' ? '.pdf,.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.xls,.xlsx';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validar tamanho do arquivo
        const maxSize = type === 'attachment' ? 10 * 1024 * 1024 : 15 * 1024 * 1024; // 10MB ou 15MB
        if (file.size > maxSize) {
          toast({
            title: "Arquivo muito grande",
            description: `O arquivo deve ter no máximo ${maxSize / (1024 * 1024)}MB`,
            variant: "destructive",
          });
          return;
        }

        // Validar tipo do arquivo - usar principalmente extensão pois MIME types podem variar
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        
        const allowedExts = type === 'attachment'
          ? ['.pdf', '.jpg', '.jpeg', '.png']
          : ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt', '.xls', '.xlsx'];
        
        if (!allowedExts.includes(fileExt)) {
          toast({
            title: "Tipo de arquivo não permitido",
            description: type === 'attachment' 
              ? "Apenas arquivos PDF, JPG e PNG são permitidos"
              : "Apenas arquivos PDF, JPG, PNG, DOC, DOCX, TXT, XLS e XLSX são permitidos",
            variant: "destructive",
          });
          return;
        }

        if (type === 'attachment') {
          handleDocumentUpload(requestId, file);
        } else {
          handleAdditionalDocumentUpload(requestId, file);
        }
      }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  // Handle opening edit modal
  const handleOpenEditModal = () => {
    if (patientData?.patient) {
      setEditForm({
        name: patientData.patient.name || "",
        socialName: patientData.patient.socialName || "",
        phone: patientData.patient.phone || "",
        address: patientData.patient.address || "",
        city: patientData.patient.city || "",
        state: patientData.patient.state || "",
      });
      setShowEditModal(true);
    }
  };

  // Handle form submission
  const handleSubmitEdit = () => {
    updatePatientMutation.mutate(editForm);
  };

  // Handle register form submission
  const handleSubmitRegister = () => {
    const formData = {
      ...registerForm,
      age: parseInt(registerForm.age),
      birthDate: registerForm.birthDate ? new Date(registerForm.birthDate) : undefined,
    };
    createPatientMutation.mutate(formData);
  };

  // Handle opening register modal
  const handleOpenRegisterModal = () => {
    setRegisterForm({
      ...registerForm,
      cpf: cpf,
    });
    setShowRegisterForm(true);
  };

  // Função para validar CPF
  const isValidCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    return cpf[9] === digit1.toString() && cpf[10] === digit2.toString();
  };

  const handleSearch = () => {
    if (!cpf.trim()) {
      toast({
        title: "CPF obrigatório",
        description: "Por favor, informe um CPF para consulta.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato do CPF
    if (!isValidCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, informe um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    // Atualizar o CPF de busca para disparar a query
    setSearchCpf(cpf);
  };

  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return formatted;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setCpf(value);
    }
  };

  const handlePhotoUpload = (patientId: number, photoType: 'front' | 'back', file: File) => {
    setUploadingPhoto({ patientId, type: photoType });
    uploadPhotoMutation.mutate({ patientId, file, photoType });
  };

  const getStatusBadge = (status: string, isUrgent: boolean) => {
    const baseClasses = "text-xs font-medium";

    if (isUrgent) {
      return <Badge variant="destructive" className={baseClasses}>URGENTE - {getStatusText(status)}</Badge>;
    }

    switch (status) {
      case 'received':
        return <Badge variant="secondary" className={baseClasses}>Recebida</Badge>;
      case 'accepted':
        return <Badge variant="default" className={baseClasses}>Aceita</Badge>;
      case 'confirmed':
        return <Badge className={`${baseClasses} bg-blue-100 text-blue-800`}>Confirmada</Badge>;
      case 'completed':
        return <Badge className={`${baseClasses} bg-green-100 text-green-800`}>Concluída</Badge>;
      default:
        return <Badge variant="outline" className={baseClasses}>{status}</Badge>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received': return 'Recebida';
      case 'accepted': return 'Aceita';
      case 'confirmed': return 'Confirmada';
      case 'completed': return 'Concluída';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Login Button */}
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sistema de Saúde - Consulta de Status
            </h1>
            <p className="text-gray-600">
              Digite o CPF do paciente para consultar todas as requisições de exames e consultas
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Entrar no Sistema
            </Button>
          </div>
        </div>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar por CPF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 max-w-md">
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={formatCpf(cpf)}
                onChange={handleCpfChange}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={cpf.length !== 11 || isLoading}>
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searchCpf && !isLoading && patientData === null && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">CPF não encontrado</h3>
                <p className="text-gray-600 mb-4">
                  Não foram encontradas informações para o CPF {formatCpf(searchCpf)}.
                </p>
                <Button onClick={handleOpenRegisterModal} className="bg-blue-600 hover:bg-blue-700">
                  <User className="h-4 w-4 mr-2" />
                  Cadastrar Paciente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                <XCircle className="h-8 w-8 mx-auto mb-2" />
                Erro ao buscar dados. Verifique o CPF e tente novamente.
              </div>
            </CardContent>
          </Card>
        )}

        {patientData && (
          <>
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações do Paciente
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEditModal}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <strong>Nome:</strong> {patientData.patient?.name}
                  </div>
                  {patientData.patient?.socialName && (
                    <div>
                      <strong>Apelido:</strong> {patientData.patient.socialName}
                    </div>
                  )}
                  <div>
                    <strong>CPF:</strong> {formatCpf(patientData.patient?.cpf || "")}
                  </div>
                  <div>
                    <strong>Idade:</strong> {patientData.patient?.age} anos
                  </div>
                  <div>
                    <strong>Telefone:</strong> {patientData.patient?.phone}
                  </div>
                  {patientData.patient?.birthDate && (
                    <div>
                      <strong>Data de Nascimento:</strong>{" "}
                      {new Date(patientData.patient.birthDate).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  {patientData.patient?.address && (
                    <div className="col-span-full flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                      <div>
                        <strong>Endereço:</strong> {patientData.patient.address}
                        {patientData.patient?.city && patientData.patient?.state && (
                          <>, {patientData.patient.city} - {patientData.patient.state}</>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Identity Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Documentos de Identidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Foto da frente da identidade */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Frente da Identidade</span>
                    {patientData.patient?.idPhotoFront ? (
                      <div className="relative group">
                        <img
                          src={`/api/patients/${patientData.patient.id}/id-photo/front`}
                          alt="Frente da Identidade"
                          className="w-32 h-20 object-cover rounded border cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => window.open(`/api/patients/${patientData.patient.id}/id-photo/front`, '_blank')}
                        />
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <label className="bg-blue-600 text-white p-1 rounded cursor-pointer hover:bg-blue-700">
                              <Edit className="h-3 w-3" />
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handlePhotoUpload(patientData.patient.id, 'front', file);
                                  }
                                }}
                              />
                            </label>
                            <button
                              onClick={() => deletePhotoMutation.mutate({ patientId: patientData.patient.id, photoType: 'front' })}
                              className="bg-red-600 text-white p-1 rounded hover:bg-red-700"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="w-32 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoUpload(patientData.patient.id, 'front', file);
                            }
                          }}
                        />
                        {uploadingPhoto?.patientId === patientData.patient.id && uploadingPhoto?.type === 'front' ? (
                          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500 text-center">Enviar foto</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  {/* Foto do verso da identidade */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Verso da Identidade</span>
                    {patientData.patient?.idPhotoBack ? (
                      <div className="relative group">
                        <img
                          src={`/api/patients/${patientData.patient.id}/id-photo/back`}
                          alt="Verso da Identidade"
                          className="w-32 h-20 object-cover rounded border cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => window.open(`/api/patients/${patientData.patient.id}/id-photo/back`, '_blank')}
                        />
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <label className="bg-blue-600 text-white p-1 rounded cursor-pointer hover:bg-blue-700">
                              <Edit className="h-3 w-3" />
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handlePhotoUpload(patientData.patient.id, 'back', file);
                                  }
                                }}
                              />
                            </label>
                            <button
                              onClick={() => deletePhotoMutation.mutate({ patientId: patientData.patient.id, photoType: 'back' })}
                              className="bg-red-600 text-white p-1 rounded hover:bg-red-700"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="w-32 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoUpload(patientData.patient.id, 'back', file);
                            }
                          }}
                        />
                        {uploadingPhoto?.patientId === patientData.patient.id && uploadingPhoto?.type === 'back' ? (
                          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500 text-center">Enviar foto</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                {/* Informações sobre upload */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Instruções:</strong> Clique nas áreas pontilhadas para enviar as fotos da frente e verso do seu documento de identidade. 
                    Passe o mouse sobre as fotos existentes para ver as opções de editar ou remover.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Requests Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Histórico de Requisições ({patientData.requests?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientData.requests && patientData.requests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Atendente</TableHead>
                          <TableHead>Unidade de Saúde</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Registrador</TableHead>
                          <TableHead>Agendamento</TableHead>
                          <TableHead>Anexo</TableHead>
                          <TableHead>Doc. Adicional</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientData.requests.map((request: Request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {request.examType?.name || request.consultationType?.name}
                                </div>
                                {request.urgencyExplanation && (
                                  <div className="text-sm text-red-600 mt-1">
                                    Urgência: {request.urgencyExplanation}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.doctor?.firstName} {request.doctor?.lastName}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{request.healthUnit?.name}</div>
                                <div className="text-sm text-gray-500">{request.healthUnit?.address}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status, request.isUrgent)}
                            </TableCell>
                            <TableCell>
                              {request.registrar 
                                ? `${request.registrar.firstName} ${request.registrar.lastName}`
                                : "Aguardando"}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                // Cast para any temporariamente para acessar os campos
                                const req = request as any;
                                console.log('Debug request:', {
                                  id: req.id,
                                  status: req.status,
                                  examLocation: req.examLocation,
                                  examDate: req.examDate,
                                  examTime: req.examTime,
                                  resultFileName: req.resultFileName
                                });
                                
                                if (req.status === 'completed' && (req.examLocation || req.examDate || req.examTime)) {
                                  return (
                                    <div className="space-y-1">
                                      {req.examLocation && (
                                        <div className="flex items-center gap-1 text-sm">
                                          <MapPin className="h-3 w-3 text-gray-500" />
                                          <span className="font-medium">Local:</span> {req.examLocation}
                                        </div>
                                      )}
                                      {req.examDate && (
                                        <div className="flex items-center gap-1 text-sm">
                                          <Calendar className="h-3 w-3 text-gray-500" />
                                          <span className="font-medium">Data:</span> {req.examDate}
                                        </div>
                                      )}
                                      {req.examTime && (
                                        <div className="flex items-center gap-1 text-sm">
                                          <Clock className="h-3 w-3 text-gray-500" />
                                          <span className="font-medium">Horário:</span> {req.examTime}
                                        </div>
                                      )}
                                      {req.resultFileName && (
                                        <div className="flex gap-1 mt-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(`/api/requests/${req.id}/view-result`, '_blank')}
                                            className="flex items-center gap-1 text-xs"
                                          >
                                            <Eye className="h-3 w-3" />
                                            Ver Resultado
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const link = document.createElement('a');
                                              link.href = `/api/requests/${req.id}/download-result`;
                                              link.download = req.resultFileName || `resultado-${req.id}.pdf`;
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                            }}
                                            className="flex items-center gap-1 text-xs"
                                          >
                                            <Download className="h-3 w-3" />
                                            Baixar
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else if (req.status === 'completed') {
                                  return <span className="text-sm text-gray-500">Concluído sem agendamento</span>;
                                } else {
                                  return <span className="text-sm text-gray-400">Aguardando conclusão</span>;
                                }
                              })()}
                            </TableCell>
                            <TableCell>
                              {request.attachmentFileName && request.examTypeId ? (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/api/requests/${request.id}/view-attachment`, '_blank')}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Ver
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = `/api/requests/${request.id}/download-attachment`;
                                      link.download = request.attachmentFileName || `exame-${request.id}.pdf`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <Download className="h-4 w-4" />
                                    Baixar
                                  </Button>
                                </div>
                              ) : request.examTypeId ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => triggerFileInput(request.id, 'attachment')}
                                    className="flex items-center gap-1"
                                    disabled={uploadingDoc}
                                  >
                                    <Upload className="h-4 w-4" />
                                    Enviar
                                  </Button>
                                  {uploadingDoc && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {request.additionalDocumentFileName ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/requests/${request.id}/download-additional-document`, '_blank')}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver Documento
                                </Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => triggerFileInput(request.id, 'additional')}
                                    className="flex items-center gap-1"
                                    disabled={uploadingAdditionalDoc}
                                  >
                                    <Upload className="h-4 w-4" />
                                    Adicionar
                                  </Button>
                                  {uploadingAdditionalDoc && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma requisição encontrada para este paciente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        

        {/* Edit Patient Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Informações do Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informações Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="socialName">Apelido</Label>
                    <Input
                      id="socialName"
                      value={editForm.socialName}
                      onChange={(e) => setEditForm({ ...editForm, socialName: e.target.value })}
                      placeholder="Como prefere ser chamado"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Rua, número, bairro"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      placeholder="Estado (UF)"
                    />
                  </div>
                </div>
              </div>



              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={updatePatientMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitEdit}
                  disabled={updatePatientMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updatePatientMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>



        {/* Register Patient Modal */}
        <Dialog open={showRegisterForm} onOpenChange={setShowRegisterForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cadastrar Novo Paciente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="register-name">Nome Completo *</Label>
                  <Input
                    id="register-name"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    placeholder="Nome completo do paciente"
                  />
                </div>
                <div>
                  <Label htmlFor="register-social-name">Apelido</Label>
                  <Input
                    id="register-social-name"
                    value={registerForm.socialName}
                    onChange={(e) => setRegisterForm({ ...registerForm, socialName: e.target.value })}
                    placeholder="Apelido (opcional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="register-cpf">CPF *</Label>
                  <Input
                    id="register-cpf"
                    value={formatCpf(registerForm.cpf)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 11) {
                        setRegisterForm({ ...registerForm, cpf: value });
                      }
                    }}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="register-age">Idade *</Label>
                  <Input
                    id="register-age"
                    type="number"
                    value={registerForm.age}
                    onChange={(e) => setRegisterForm({ ...registerForm, age: e.target.value })}
                    placeholder="Idade"
                    min="0"
                    max="120"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="register-phone">Telefone *</Label>
                  <Input
                    id="register-phone"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="register-birth-date">Data de Nascimento</Label>
                  <Input
                    id="register-birth-date"
                    type="date"
                    value={registerForm.birthDate}
                    onChange={(e) => setRegisterForm({ ...registerForm, birthDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="register-address">Endereço</Label>
                <Input
                  id="register-address"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="register-city">Cidade</Label>
                  <Input
                    id="register-city"
                    value={registerForm.city}
                    onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label htmlFor="register-state">Estado</Label>
                  <Input
                    id="register-state"
                    value={registerForm.state}
                    onChange={(e) => setRegisterForm({ ...registerForm, state: e.target.value })}
                    placeholder="Estado"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRegisterForm(false)}
                  disabled={createPatientMutation.isPending}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitRegister}
                  disabled={createPatientMutation.isPending || !registerForm.name || !registerForm.cpf || !registerForm.age || !registerForm.phone}
                  className="flex-1"
                >
                  {createPatientMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Cadastrar Paciente
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}