import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, LogOut, BarChart3, History, User, Printer, Eye, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import PatientDetailsModal from "@/components/PatientDetailsModal";
import NotificationBanner from "@/components/NotificationBanner";

export default function RequestPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  // State for search functionality
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [showEditPatient, setShowEditPatient] = useState(false);
  
  // State for other modals
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você precisa estar logado. Redirecionando...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch quota usage for current month
  const { data: quotaUsage = [] } = useQuery({
    queryKey: ["/api/dashboard/quota-usage"],
    enabled: isAuthenticated,
  });

  // Fetch suspended requests for current user
  const { data: userSuspendedRequests = [] } = useQuery({
    queryKey: ['/api/requests/user-suspended'],
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  // Search patient by name or CPF
  const searchPatient = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        if (results.length === 0) {
          toast({
            title: "Nenhum paciente encontrado",
            description: "Não foi encontrado nenhum paciente com esses dados.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro na busca",
          description: "Erro ao buscar paciente. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na busca",
        description: "Erro ao conectar com o servidor.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const searchPatientByCpf = async (cpf: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/patients/by-cpf/${encodeURIComponent(cpf)}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const patient = await response.json();
        setSearchResults([patient]);
        
        // Buscar histórico automaticamente
        const historyResponse = await fetch(`/api/patients/${patient.id}/requests`, {
          credentials: 'include',
        });
        
        if (historyResponse.ok) {
          const history = await historyResponse.json();
          setPatientHistory(history);
        }
      } else {
        toast({
          title: "Paciente não encontrado",
          description: "Não foi encontrado nenhum paciente com esse CPF.",
          variant: "destructive",
        });
        setSearchResults([]);
        setPatientHistory([]);
      }
    } catch (error) {
      toast({
        title: "Erro na busca",
        description: "Erro ao conectar com o servidor.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Função para verificar se a requisição tem anexo PDF e está concluída
  const canPrintRequest = (request: any) => {
    const isCompleted = request.status === 'completed';
    const hasResultFile = request.resultFileName && request.resultFileName.toLowerCase().endsWith('.pdf');
    return isCompleted && hasResultFile;
  };

  // Função para abrir o PDF do resultado do exame
  const printRequest = (request: any, patient: any) => {
    // Abre o PDF do resultado diretamente
    if (request.resultFileName) {
      const pdfUrl = `/api/requests/${request.id}/result`;
      window.open(pdfUrl, '_blank');
    }
  };

  const logout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Redirecionando para login...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <NotificationBanner userRole={user?.role} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Painel de Consulta</h1>
                <p className="text-sm text-gray-600">Consulte requisições existentes e dados de pacientes</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'Administrador' : 
                   user?.role === 'regulacao' ? 'Regulação' : 'Recepção'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangePassword(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Perfil
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CPF Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Paciente por CPF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="cpfSearch">CPF do Paciente</Label>
                <Input
                  id="cpfSearch"
                  placeholder="000.000.000-00"
                  value={patientSearchQuery}
                  onChange={(e) => {
                    setPatientSearchQuery(e.target.value);
                    // Auto-search when CPF has 11 digits
                    const cleanCpf = e.target.value.replace(/\D/g, '');
                    if (cleanCpf.length === 11) {
                      searchPatientByCpf(e.target.value);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && patientSearchQuery.trim()) {
                      searchPatientByCpf(patientSearchQuery);
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  if (patientSearchQuery.trim()) {
                    searchPatientByCpf(patientSearchQuery);
                  }
                }}
                disabled={isSearching || !patientSearchQuery.trim()}
              >
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dados do Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              {searchResults.map((patient: any) => (
                <div key={patient.id} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-medium">{patient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">CPF</p>
                      <p className="font-medium">{patient.cpf}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Telefone</p>
                      <p className="font-medium">{patient.phone || 'Não informado'}</p>
                    </div>
                    {patient.address && (
                      <div className="md:col-span-3">
                        <p className="text-sm text-gray-600">Endereço</p>
                        <p className="font-medium">{patient.address}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        setSelectedPatientId(patient.id);
                        setShowEditPatient(true);
                      }}
                      variant="outline"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Dados
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Patient History */}
        {patientHistory && patientHistory.length > 0 && searchResults && searchResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Requisições ({patientHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {patientHistory.map((request: any) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'received': return 'bg-gray-100 text-gray-800 border-gray-300';
                      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
                      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
                      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      case 'suspenso': return 'bg-red-100 text-red-800 border-red-300';
                      default: return 'bg-gray-100 text-gray-800 border-gray-300';
                    }
                  };

                  const getStatusName = (status: string) => {
                    switch (status) {
                      case 'received': return 'Recebida';
                      case 'pending': return 'Pendente';
                      case 'accepted': return 'Aceita';
                      case 'confirmed': return 'Confirmada';
                      case 'completed': return 'Concluída';
                      case 'suspenso': return 'Suspenso';
                      default: return status;
                    }
                  };

                  return (
                    <div
                      key={request.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${getStatusColor(request.status)}`}
                    >
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium">Requisição #{request.id}</p>
                          <p className="text-xs">
                            {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {request.examType && (typeof request.examType === 'object' ? request.examType.name : request.examType)}
                            {request.consultationType && (typeof request.consultationType === 'object' ? request.consultationType.name : request.consultationType)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {request.examType ? 'Exame' : 'Consulta'}
                            {request.isUrgent && <span className="ml-2 text-red-600 font-bold">URGENTE</span>}
                          </p>
                        </div>
                        
                        <div>
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(request.status)} border-2`}
                          >
                            {getStatusName(request.status)}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          {canPrintRequest(request) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printRequest(request, searchResults[0])}
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Imprimir
                            </Button>
                          )}
                          {request.status === 'suspenso' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-100"
                              onClick={async () => {
                                try {
                                  const response = await apiRequest(`/api/requests/${request.id}/revert-suspended`, 'PATCH');
                                  
                                  if (response.ok) {
                                    toast({
                                      title: "Requisição corrigida",
                                      description: "Status alterado para 'Recebida'",
                                      variant: "default",
                                    });
                                    // Refresh patient history by refetching the patient data
                                    if (searchResults && searchResults.length > 0) {
                                      searchPatientByCpf(searchResults[0].cpf);
                                    }
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
                              <Eye className="h-4 w-4 mr-1" />
                              Corrigido
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPatientId(searchResults[0].id);
                              setShowPatientHistory(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detalhes
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suspended Requests Section */}
        {userSuspendedRequests && userSuspendedRequests.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
                <Search className="mr-2" size={20} />
                Requisições Suspensas ({userSuspendedRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userSuspendedRequests.map((request: any) => (
                  <div key={request.id} className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <button
                            onClick={() => {
                              setSelectedPatientId(request.patient.id);
                              setShowPatientHistory(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium underline"
                          >
                            {request.patient.name}
                          </button>
                          <Badge className="bg-red-100 text-red-800 border-red-300">
                            Suspenso
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">CPF:</span> {request.patient.cpf}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Tipo:</span> {request.examType?.name || request.consultationType?.name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Requisição:</span> #{request.id}
                        </p>
                        {request.notes && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Motivo:</span> {request.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-300 text-orange-600 hover:bg-orange-100"
                          onClick={async () => {
                            try {
                              const response = await apiRequest(`/api/requests/${request.id}/revert-suspended`, 'PATCH');
                              
                              if (response.ok) {
                                toast({
                                  title: "Requisição corrigida",
                                  description: "Status alterado para 'Recebida'",
                                  variant: "default",
                                });
                                // Refresh the suspended requests list
                                queryClient.invalidateQueries({ queryKey: ['/api/requests/user-suspended'] });
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
                          <Eye className="h-4 w-4 mr-1" />
                          Corrigido
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-100"
                          onClick={async () => {
                            if (window.confirm(`Tem certeza que deseja deletar a requisição #${request.id}?`)) {
                              try {
                                const response = await apiRequest(`/api/requests/${request.id}`, 'DELETE');
                                
                                if (response.ok) {
                                  toast({
                                    title: "Requisição deletada",
                                    description: "A requisição foi removida do sistema",
                                    variant: "default",
                                  });
                                  // Refresh the suspended requests list
                                  queryClient.invalidateQueries({ queryKey: ['/api/requests/user-suspended'] });
                                } else {
                                  const errorData = await response.json();
                                  toast({
                                    title: "Erro ao deletar",
                                    description: errorData.message || "Falha ao deletar requisição",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Erro",
                                  description: "Falha ao conectar com o servidor",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Quota Graphics Section - Line Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quotas do Mês Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Exams Section - Line Format */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-700">Exames</h3>
                <div className="space-y-2">
                  {quotaUsage.filter((item: any) => item.type === 'exam').sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR')).map((exam: any, index: number) => {
                    const percentage = (exam.used / exam.quota) * 100;
                    const isAtLimit = exam.used >= exam.quota;
                    const isNearLimit = percentage >= 90;
                    const available = Math.max(0, exam.quota - exam.used);
                    
                    return (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-blue-900 truncate">{exam.name}</p>
                        </div>
                        <div className="flex-1 max-w-40">
                          <Progress value={Math.min(percentage, 100)} className="h-2" />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-blue-700 min-w-0">{exam.used}/{exam.quota}</span>
                          <Badge 
                            variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "default"}
                            className="text-xs min-w-0"
                          >
                            {available}
                          </Badge>
                          <span className="text-blue-600 font-medium min-w-0">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Consultations Section - Line Format */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-700">Consultas</h3>
                <div className="space-y-2">
                  {quotaUsage.filter((item: any) => item.type === 'consultation').sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR')).map((consultation: any, index: number) => {
                    const percentage = (consultation.used / consultation.quota) * 100;
                    const isAtLimit = consultation.used >= consultation.quota;
                    const isNearLimit = percentage >= 90;
                    const available = Math.max(0, consultation.quota - consultation.used);
                    
                    return (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-green-50 border-green-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-green-900 truncate">{consultation.name}</p>
                        </div>
                        <div className="flex-1 max-w-40">
                          <Progress value={Math.min(percentage, 100)} className="h-2" />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-700 min-w-0">{consultation.used}/{consultation.quota}</span>
                          <Badge 
                            variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "default"}
                            className="text-xs min-w-0"
                          >
                            {available}
                          </Badge>
                          <span className="text-green-600 font-medium min-w-0">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Search Modal */}
      <Dialog open={showPatientSearch} onOpenChange={setShowPatientSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar Paciente por CPF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cpf">CPF do Paciente</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && patientSearchQuery.trim()) {
                    searchPatientByCpf(patientSearchQuery);
                    setShowPatientSearch(false);
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (patientSearchQuery.trim()) {
                    searchPatientByCpf(patientSearchQuery);
                    setShowPatientSearch(false);
                  }
                }}
                disabled={isSearching || !patientSearchQuery.trim()}
                className="flex-1"
              >
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPatientSearch(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Patient Details Modal */}
      {showPatientHistory && selectedPatientId && (
        <PatientDetailsModal
          patientId={selectedPatientId}
          isOpen={showPatientHistory}
          onClose={() => {
            setShowPatientHistory(false);
            setSelectedPatientId(null);
          }}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {/* Edit Patient Modal */}
      {showEditPatient && selectedPatientId && (
        <PatientDetailsModal
          patientId={selectedPatientId}
          isOpen={showEditPatient}
          onClose={() => {
            setShowEditPatient(false);
            setSelectedPatientId(null);
            // Atualizar dados do paciente após edição
            if (searchResults && searchResults.length > 0 && searchResults[0].cpf) {
              searchPatientByCpf(searchResults[0].cpf);
            }
          }}
        />
      )}
    </div>
  );
}