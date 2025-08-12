import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Calendar, FileText, Activity, Eye, Paperclip, Download, Trash2, Edit, Save, X, MessageSquare, Plus } from "lucide-react";

interface PatientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: number;
  patient?: any;
  selectedRequest?: any;
  onPatientUpdate?: () => void;
}

interface Patient {
  id: number;
  name: string;
  age: number;
  phone: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Request {
  id: number;
  status: string;
  isUrgent: boolean;
  urgencyExplanation?: string;
  createdAt: string;
  examType?: { name: string };
  consultationType?: { name: string };
  doctor: { id?: number; firstName?: string; lastName?: string };
  registrar?: { firstName?: string; lastName?: string };
  attachmentFileName?: string;
  additionalDocumentFileName?: string;
}

export default function PatientDetailsModal({ isOpen, onClose, patientId, patient: externalPatient, selectedRequest, onPatientUpdate }: PatientDetailsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get the actual patient ID from props or external patient
  const actualPatientId = patientId || externalPatient?.id;

  // Function to extract original filename from technical filename
  const getOriginalFileName = (technicalFileName: string): string => {
    if (!technicalFileName) return "";
    
    // Technical format: "request-1752617405257-301113958-szasd.png"
    // Extract everything after the last dash before the extension
    const parts = technicalFileName.split('-');
    if (parts.length >= 4) {
      // Get the last part which contains the original name
      const lastPart = parts[parts.length - 1];
      return lastPart || "Anexo";
    }
    
    // Fallback: return the original filename as is
    return technicalFileName;
  };

  // Function to check if current user can delete a request
  const canDeleteRequest = (request: any): boolean => {
    // Admin can delete any request
    if ((user as any)?.role === 'admin') {
      return true;
    }
    
    // Regulation users can delete any request (including completed ones)
    if ((user as any)?.role === 'regulacao') {
      return true;
    }
    
    // Reception users can only delete non-completed requests
    if ((user as any)?.role === 'recepcao') {
      return request.status !== 'completed';
    }
    
    return false;
  };

  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editedPatient, setEditedPatient] = useState<any>({});
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [requestComment, setRequestComment] = useState("");

  // Fetch patient details (only if we don't have external patient data)
  const { data: fetchedPatient, isLoading: patientLoading } = useQuery({
    queryKey: [`/api/patients/${actualPatientId}`],
    enabled: isOpen && !!actualPatientId && !externalPatient,
  });

  // Fetch patient requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: [`/api/patients/${actualPatientId}/requests`],
    enabled: isOpen && !!actualPatientId,
  });

  // Use external patient data if available, otherwise use fetched data
  const patient = externalPatient || fetchedPatient;



  // Update patient data mutation
  const updatePatientMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const result = await apiRequest(`/api/patients/${actualPatientId}`, "PATCH", updatedData);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Dados atualizados",
        description: "Os dados do paciente foram atualizados com sucesso.",
      });
      setIsEditingPatient(false);
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${actualPatientId}`] });
      if (onPatientUpdate) onPatientUpdate();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Erro ao atualizar",
        description: `Ocorreu um erro ao atualizar os dados: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    },
  });

  // Add comment to request mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: number, comment: string }) => {
      return await apiRequest(`/api/requests/${requestId}`, "PATCH", { notes: comment });
    },
    onSuccess: () => {
      toast({
        title: "Comentário adicionado",
        description: "O comentário foi adicionado à requisição com sucesso.",
      });
      setShowCommentModal(false);
      setRequestComment("");
      setSelectedRequestId(null);
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${actualPatientId}/requests`] });
      // Also invalidate any patient search results that might be cached
      queryClient.invalidateQueries({ queryKey: ['/api/patients/search'] });
      if (onPatientUpdate) onPatientUpdate();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Erro ao adicionar comentário",
        description: "Ocorreu um erro ao adicionar o comentário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Delete request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest(`/api/requests/${requestId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Requisição deletada",
        description: "A requisição foi removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${actualPatientId}/requests`] });
      // Also invalidate any patient search results that might be cached
      queryClient.invalidateQueries({ queryKey: ['/api/patients/search'] });
      if (onPatientUpdate) onPatientUpdate();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Erro ao deletar",
        description: "Ocorreu um erro ao deletar a requisição. Tente novamente.",
        variant: "destructive",
      });
    },
  });



  const handleEditPatient = () => {
    // Format birthDate for input field (YYYY-MM-DD format)
    let formattedBirthDate = "";
    if (patient?.birthDate) {
      const date = new Date(patient.birthDate);
      if (!isNaN(date.getTime())) {
        formattedBirthDate = date.toISOString().split('T')[0];
      }
    }

    setEditedPatient({
      name: patient?.name || "",
      cpf: patient?.cpf || "",
      phone: patient?.phone || "",
      age: patient?.age || 0,
      socialName: patient?.socialName || "",
      address: patient?.address || "",
      city: patient?.city || "",
      state: patient?.state || "",
      birthDate: formattedBirthDate
    });
    setIsEditingPatient(true);
  };

  const handleSavePatient = () => {
    if (!editedPatient.name || !editedPatient.phone) {
      toast({
        title: "Erro de validação",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for backend, converting birthDate string to Date object if needed
    const dataToSend = { ...editedPatient };
    if (dataToSend.birthDate && typeof dataToSend.birthDate === 'string') {
      // Only convert if it's a valid date string
      const dateStr = dataToSend.birthDate;
      if (dateStr && dateStr !== '') {
        dataToSend.birthDate = new Date(dateStr);
      } else {
        // Remove empty birthDate to avoid errors
        delete dataToSend.birthDate;
      }
    }
    
    updatePatientMutation.mutate(dataToSend);
  };

  const handleDeleteRequest = (requestId: number, requestType: string) => {
    if (window.confirm(`Tem certeza que deseja deletar esta requisição de ${requestType}?`)) {
      deleteRequestMutation.mutate(requestId);
    }
  };

  const handleAddComment = (requestId: number) => {
    setSelectedRequestId(requestId);
    setShowCommentModal(true);
  };

  const handleSaveComment = () => {
    if (selectedRequestId && requestComment.trim()) {
      addCommentMutation.mutate({ requestId: selectedRequestId, comment: requestComment });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "received": return "default";
      case "accepted": return "secondary";
      case "confirmed": return "outline";
      case "completed": return "default";
      case "suspenso": return "destructive";
      default: return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "received": return "Recebida";
      case "accepted": return "Aceita";
      case "confirmed": return "Confirmada";
      case "completed": return "Concluída";
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes do Paciente
          </DialogTitle>
        </DialogHeader>

        {patientLoading ? (
          <div className="p-6 text-center">Carregando dados do paciente...</div>
        ) : patient ? (
          <div className="space-y-6">
            {/* Patient Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold text-gray-800">Informações do Paciente</Label>
                {!isEditingPatient && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditPatient}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Dados
                  </Button>
                )}
              </div>

              {isEditingPatient ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-blue-50">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Nome Completo</Label>
                    <Input
                      value={editedPatient.name}
                      onChange={(e) => setEditedPatient({...editedPatient, name: e.target.value})}
                      placeholder="Nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">CPF</Label>
                    <Input
                      value={editedPatient.cpf}
                      onChange={(e) => setEditedPatient({...editedPatient, cpf: e.target.value})}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Idade (calculada automaticamente)</Label>
                    <Input
                      type="number"
                      value={editedPatient.age}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                      placeholder="Idade calculada automaticamente"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Telefone</Label>
                    <Input
                      value={editedPatient.phone}
                      onChange={(e) => setEditedPatient({...editedPatient, phone: e.target.value})}
                      placeholder="Telefone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Nome Social</Label>
                    <Input
                      value={editedPatient.socialName}
                      onChange={(e) => setEditedPatient({...editedPatient, socialName: e.target.value})}
                      placeholder="Nome social (opcional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Endereço</Label>
                    <Input
                      value={editedPatient.address}
                      onChange={(e) => setEditedPatient({...editedPatient, address: e.target.value})}
                      placeholder="Endereço"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Cidade</Label>
                    <Input
                      value={editedPatient.city}
                      onChange={(e) => setEditedPatient({...editedPatient, city: e.target.value})}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Estado</Label>
                    <Input
                      value={editedPatient.state}
                      onChange={(e) => setEditedPatient({...editedPatient, state: e.target.value})}
                      placeholder="Estado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={editedPatient.birthDate}
                      onChange={(e) => {
                        const newBirthDate = e.target.value;
                        let calculatedAge = 0;
                        
                        // Calculate age automatically
                        if (newBirthDate) {
                          const birthDate = new Date(newBirthDate);
                          const today = new Date();
                          calculatedAge = today.getFullYear() - birthDate.getFullYear();
                          const monthDiff = today.getMonth() - birthDate.getMonth();
                          
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            calculatedAge--;
                          }
                        }
                        
                        setEditedPatient({
                          ...editedPatient, 
                          birthDate: newBirthDate,
                          age: calculatedAge
                        });
                      }}
                      placeholder="Data de nascimento"
                    />
                  </div>

                  <div className="col-span-2 flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingPatient(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSavePatient}
                      disabled={updatePatientMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Nome Completo</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-lg font-medium">{patient.name}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">CPF</Label>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-lg">{patient.cpf || 'Não informado'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Idade</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-lg">{patient.age} anos</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Telefone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-lg">{patient.phone}</span>
                      <a 
                        href={`https://wa.me/+55${patient.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Cadastrado em</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{new Date(patient.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  {patient.socialName && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-600">Nome Social</Label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-lg">{patient.socialName}</span>
                      </div>
                    </div>
                  )}

                  {patient.address && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-600">Endereço</Label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-lg">{patient.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Request Details Section - only show when selectedRequest is provided */}
            {selectedRequest && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Detalhes da Requisição
                  </Label>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Tipo:</strong>{" "}
                          {selectedRequest.examType?.name || selectedRequest.consultationType?.name || "Não especificado"}
                        </div>
                        <div className="text-sm">
                          <strong>Status:</strong>{" "}
                          <Badge variant={getStatusBadgeVariant(selectedRequest.status)}>
                            {getStatusText(selectedRequest.status)}
                          </Badge>
                          {selectedRequest.isUrgent && (
                            <Badge variant="destructive" className="ml-2">Urgente</Badge>
                          )}
                        </div>
                        <div className="text-sm">
                          <strong>Atendente:</strong>{" "}
                          {selectedRequest.doctor.firstName && selectedRequest.doctor.lastName 
                            ? `${selectedRequest.doctor.firstName} ${selectedRequest.doctor.lastName}`
                            : "Não informado"}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Data da criação:</strong>{" "}
                          {new Date(selectedRequest.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                        {selectedRequest.registrar && (
                          <div className="text-sm">
                            <strong>Registrador:</strong>{" "}
                            {selectedRequest.registrar.firstName && selectedRequest.registrar.lastName
                              ? `${selectedRequest.registrar.firstName} ${selectedRequest.registrar.lastName}`
                              : "Não informado"}
                          </div>
                        )}
                        {selectedRequest.urgencyExplanation && (
                          <div className="text-sm">
                            <strong>Motivo da urgência:</strong>{" "}
                            {selectedRequest.urgencyExplanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />
                
                {/* Request Files Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Arquivos da Requisição Selecionada
                  </Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Documento da Requisição</h4>
                      {selectedRequest.attachmentFileName ? (
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {getOriginalFileName(selectedRequest.attachmentFileName)}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const url = `/api/requests/${selectedRequest.id}/view-attachment`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const url = `/api/requests/${selectedRequest.id}/view-attachment?download=1`;
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = selectedRequest.attachmentFileName || 'documento';
                                  a.click();
                                }}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum documento anexado</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Documento Adicional</h4>
                      {selectedRequest.additionalDocumentFileName ? (
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {getOriginalFileName(selectedRequest.additionalDocumentFileName)}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const url = `/api/requests/${selectedRequest.id}/view-additional-document`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const url = `/api/requests/${selectedRequest.id}/view-additional-document?download=1`;
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = selectedRequest.additionalDocumentFileName || 'documento-adicional';
                                  a.click();
                                }}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum documento adicional</p>
                      )}
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* Identity Photos Section */}
            {(patient.idPhotoFront || patient.idPhotoBack) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Documentos de Identidade
                  </Label>
                  <div className="flex gap-6">
                    {patient.idPhotoFront && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Frente da Identidade</span>
                        <img
                          src={`/api/patients/${patient.id}/id-photo/front`}
                          alt="Frente da Identidade"
                          className="w-32 h-20 object-cover rounded border cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => window.open(`/api/patients/${patient.id}/id-photo/front`, '_blank')}
                        />
                      </div>
                    )}
                    {patient.idPhotoBack && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Verso da Identidade</span>
                        <img
                          src={`/api/patients/${patient.id}/id-photo/back`}
                          alt="Verso da Identidade"
                          className="w-32 h-20 object-cover rounded border cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => window.open(`/api/patients/${patient.id}/id-photo/back`, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}



            <Separator />

            {/* Patient Requests History */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Histórico de Requisições
              </Label>

              {requestsLoading ? (
                <div className="p-4 text-center text-gray-500">Carregando histórico...</div>
              ) : requests && requests.length > 0 ? (
                <div className="space-y-3">
                  {requests.map((request: Request) => (
                    <div key={request.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(request.status)}>
                              {getStatusText(request.status)}
                            </Badge>
                            {request.isUrgent && (
                              <Badge variant="destructive">Urgente</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <strong>Tipo:</strong>{" "}
                            {request.examType?.name || request.consultationType?.name || "Não especificado"}
                          </div>
                          
                          <div className="text-sm">
                            <strong>Atendente:</strong>{" "}
                            {request.doctor.firstName && request.doctor.lastName 
                              ? `${request.doctor.firstName} ${request.doctor.lastName}`
                              : "Não informado"}
                          </div>
                          
                          {request.registrar && (
                            <div className="text-sm">
                              <strong>Registrador:</strong>{" "}
                              {request.registrar.firstName && request.registrar.lastName
                                ? `${request.registrar.firstName} ${request.registrar.lastName}`
                                : "Não informado"}
                            </div>
                          )}
                          
                          {request.urgencyExplanation && (
                            <div className="text-sm">
                              <strong>Motivo da urgência:</strong> {request.urgencyExplanation}
                            </div>
                          )}
                          
                          {(request as any).notes && (
                            <div className="text-sm">
                              <strong>Comentários:</strong> {(request as any).notes}
                            </div>
                          )}
                          
                          {/* Informações específicas para exames concluídos */}
                          {request.status === 'completed' && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                              <div className="text-sm font-semibold text-green-800 mb-2">
                                Informações do Exame Concluído
                              </div>
                              
                              <div className="flex flex-wrap gap-4 text-sm text-green-700">
                                {request.examLocation && (
                                  <span><strong>Local:</strong> {request.examLocation}</span>
                                )}
                                
                                {request.examDate && (
                                  <span><strong>Data:</strong> {request.examDate}</span>
                                )}
                                
                                {request.examTime && (
                                  <span><strong>Horário:</strong> {request.examTime}</span>
                                )}
                                
                                {request.completedDate && (
                                  <span><strong>Concluído em:</strong> {new Date(request.completedDate).toLocaleString("pt-BR")}</span>
                                )}
                              </div>
                              
                              {/* Botão para resultado do exame */}
                              {request.resultFileName && (
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white border-green-600"
                                    onClick={() => {
                                      const url = `/api/requests/${request.id}/view-result`;
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Ver Resultado
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-gray-500">
                            {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddComment(request.id)}
                              className="h-7 px-2"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Comentar
                            </Button>
                            {canDeleteRequest(request) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteRequest(
                                  request.id, 
                                  request.examType?.name || request.consultationType?.name || "procedimento"
                                )}
                                disabled={deleteRequestMutation.isPending}
                                className="h-7 px-2"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Deletar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Anexos da Requisição */}
                      {(request.attachmentFileName || request.additionalDocumentFileName || request.resultFileName) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            Anexos {request.status === 'completed' ? 'e Resultado' : ''}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {request.attachmentFileName && (
                              <div className="p-2 border rounded bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Paperclip className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-700 truncate">
                                      {getOriginalFileName(request.attachmentFileName)}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2"
                                      onClick={() => {
                                        const url = `/api/requests/${request.id}/view-attachment`;
                                        window.open(url, '_blank');
                                      }}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={() => {
                                        const url = `/api/requests/${request.id}/view-attachment?download=1`;
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = request.attachmentFileName || 'documento';
                                        a.click();
                                      }}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {request.additionalDocumentFileName && (
                              <div className="p-2 border rounded bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Paperclip className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-700 truncate">
                                      {getOriginalFileName(request.additionalDocumentFileName)}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2"
                                      onClick={() => {
                                        const url = `/api/requests/${request.id}/view-additional-document`;
                                        window.open(url, '_blank');
                                      }}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={() => {
                                        const url = `/api/requests/${request.id}/view-additional-document?download=1`;
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = request.additionalDocumentFileName || 'documento';
                                        a.click();
                                      }}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Arquivo de Resultado do Exame */}
                            {request.resultFileName && request.status === 'completed' && (
                              <div className="p-2 border rounded bg-green-50 border-green-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-700 font-medium truncate">
                                      Resultado do Exame
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white border-green-600"
                                      onClick={() => {
                                        const url = `/api/requests/${request.id}/view-result`;
                                        window.open(url, '_blank');
                                      }}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-green-600 hover:bg-green-100"
                                      onClick={() => {
                                        const url = `/api/requests/${request.id}/view-result?download=1`;
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = request.resultFileName || 'resultado-exame';
                                        a.click();
                                      }}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Nenhuma requisição encontrada para este paciente
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-red-500">
            Erro ao carregar dados do paciente
          </div>
        )}
      </DialogContent>
      
      {/* Comment Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Adicionar Comentário
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comentário</Label>
              <Textarea
                id="comment"
                value={requestComment}
                onChange={(e) => setRequestComment(e.target.value)}
                placeholder="Digite seu comentário sobre esta requisição..."
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCommentModal(false);
                  setRequestComment("");
                  setSelectedRequestId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveComment}
                disabled={addCommentMutation.isPending || !requestComment.trim()}
              >
                {addCommentMutation.isPending ? "Salvando..." : "Salvar Comentário"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}