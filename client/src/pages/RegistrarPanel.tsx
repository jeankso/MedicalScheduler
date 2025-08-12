import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, User, Upload, Download, Paperclip, Eye, RefreshCw, X, Hand, Search, Trash2, Bell, Plus, Edit, Send } from "lucide-react";
import PatientDetailsModal from "@/components/PatientDetailsModal";
// RequestDocumentManager removido conforme solicitado
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import NotificationBanner from "@/components/NotificationBanner";

export default function RegistrarPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [uploadingRequestId, setUploadingRequestId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRequestForFiles, setSelectedRequestForFiles] = useState<any | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [selectedRequestForCompletion, setSelectedRequestForCompletion] = useState<any | null>(null);
  const [examLocation, setExamLocation] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [suspensionModalOpen, setSuspensionModalOpen] = useState(false);
  const [selectedRequestForSuspension, setSelectedRequestForSuspension] = useState<any | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  
  // Patient search states
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Notification states
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success',
    targetRole: ''
  });
  const [editingNotification, setEditingNotification] = useState<any>(null);
  // Estado de documentos removido conforme solicitado

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

  // Patient search function with debounce
  const searchPatients = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await apiRequest(`/api/patients/search?q=${encodeURIComponent(searchTerm.trim())}`, 'GET');
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        throw new Error('Erro na busca');
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(patientSearchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [patientSearchTerm, searchPatients]);

  const handlePatientSearch = () => {
    searchPatients(patientSearchTerm);
  };

  // Auto-refresh functionality for regulation panel
  useEffect(() => {
    if (!autoRefreshEnabled || !isAuthenticated || !user) return;

    // Only enable auto-refresh for regulation role
    if ((user as any)?.role !== 'regulacao') return;

    const interval = setInterval(() => {
      // Refresh main data queries used by regulation panel
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/requests/urgent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, isAuthenticated, user, queryClient]);

  // Fetch dashboard stats
  const { data: stats = { received: 0, accepted: 0, confirmed: 0, completed: 0 } } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch urgent requests
  const { data: allUrgentRequests = [] } = useQuery({
    queryKey: ["/api/requests/urgent"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch all requests
  const { data: allRequests = [] } = useQuery({
    queryKey: ["/api/requests"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch notifications (admin/regulacao only)
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated && ((user as any)?.role === 'admin' || (user as any)?.role === 'regulacao'),
  });

  // Function to filter by current month and previous months
  const filterByCurrentMonth = useMemo(() => {
    return (request: any) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const requestDate = new Date(request.createdAt);
      const requestMonth = requestDate.getMonth();
      const requestYear = requestDate.getFullYear();

      // Show requests from current year and month, or previous months of current year
      if (requestYear === currentYear) {
        return requestMonth <= currentMonth;
      }

      // Show requests from previous years
      return requestYear < currentYear;
    };
  }, []);

  // Filter urgent requests to exclude completed, awaiting analysis and suspended, show current and previous months
  const urgentRequests = useMemo(() => {
    return Array.isArray(allUrgentRequests) 
      ? allUrgentRequests.filter((request: any) => 
          request.status !== 'completed' && 
          request.status !== 'Aguardando Análise' &&
          request.status !== 'suspenso' &&
          filterByCurrentMonth(request)
        )
      : [];
  }, [allUrgentRequests, filterByCurrentMonth]);

  // Filter suspended requests - only show suspended ones
  const suspendedRequests = useMemo(() => {
    return Array.isArray(allRequests) 
      ? allRequests.filter((request: any) => 
          request.status === 'suspenso' &&
          filterByCurrentMonth(request)
        )
      : [];
  }, [allRequests, filterByCurrentMonth]);

  // Fetch quota usage data for current month
  const { data: quotaUsage = [] } = useQuery({
    queryKey: ["/api/dashboard/quota-usage"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Suspended requests functionality removed - we don't show them in this panel

  // CPF exibido sem formatação conforme solicitado

  // Helper function to get quota info for a service
  const getQuotaInfo = (serviceName: string) => {
    if (!Array.isArray(quotaUsage)) return { quota: 0, used: 0, remaining: 0 };

    const quotaItem = quotaUsage.find((item: any) => item.name === serviceName);
    if (!quotaItem) return { quota: 0, used: 0, remaining: 0 };

    const remaining = Math.max(0, quotaItem.quota - quotaItem.used);
    return {
      quota: quotaItem.quota,
      used: quotaItem.used,
      remaining
    };
  };

  // Suspended request mutation removed - not used in this panel

  // Function to filter by type
  const filterByType = useMemo(() => {
    return (request: any) => {
      if (typeFilter === "todos") return true;

      const serviceName = request.examType?.name || request.consultationType?.name || '';
      return serviceName.toLowerCase().includes(typeFilter.toLowerCase());
    };
  }, [typeFilter]);

  // Filter and sort requests - exclude completed, awaiting analysis and suspended, show current and previous months
  const activeRequests = useMemo(() => {
    return Array.isArray(allRequests) 
      ? allRequests
          .filter((request: any) => 
            request.status !== 'completed' && 
            request.status !== 'Aguardando Análise' &&
            request.status !== 'suspenso' &&
            filterByCurrentMonth(request) &&
            filterByType(request)
          )
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // Ascending order (oldest first)
      : [];
  }, [allRequests, filterByCurrentMonth, filterByType]);

  // Filter function specifically for current month only (not previous months)
  const filterByCurrentMonthOnly = useMemo(() => {
    return (request: any) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const requestDate = new Date(request.createdAt);
      const requestMonth = requestDate.getMonth();
      const requestYear = requestDate.getFullYear();

      // Show only requests from current year and month
      return requestYear === currentYear && requestMonth === currentMonth;
    };
  }, []);

  const completedRequests = useMemo(() => {
    return Array.isArray(allRequests) 
      ? allRequests
          .filter((request: any) => 
            request.status === 'completed' &&
            filterByCurrentMonthOnly(request) &&
            filterByType(request)
          )
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Descending order (newest first)
          .slice(0, 100) // Limitar às últimas 100 requisições
      : [];
  }, [allRequests, filterByCurrentMonthOnly, filterByType]);

  // Get unique exam and consultation types for filter dropdown (current and previous months)
  const uniqueTypes = useMemo(() => {
    if (!Array.isArray(allRequests)) return [];
    
    const typeNames = allRequests
      .filter(filterByCurrentMonth)
      .map((request: any) => 
        request.examType?.name || request.consultationType?.name
      )
      .filter(Boolean);
    
    return Array.from(new Set(typeNames)).sort();
  }, [allRequests, filterByCurrentMonth]);

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/requests/${id}/status`, "PATCH", { status });
    },
    onMutate: () => {
      // Invalidação imediata para atualização visual mais rápida
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/urgent"] });
      toast({
        title: "Status atualizado",
        description: "O status da requisição foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Você será redirecionado para fazer login novamente.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status da requisição.",
        variant: "destructive",
      });
    },
  });

  // Upload attachment mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ requestId, file }: { requestId: number; file: File }) => {
      const formData = new FormData();
      formData.append('attachment', file);
      return await apiRequest(`/api/requests/${requestId}/upload-attachment`, "POST", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setSelectedFile(null);
      setUploadingRequestId(null);
      toast({
        title: "Arquivo enviado",
        description: "O anexo foi enviado com sucesso.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Você será redirecionado para fazer login novamente.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      console.error("Error uploading file:", error);
      toast({
        title: "Erro no upload",
        description: "Falha ao enviar arquivo.",
        variant: "destructive",
      });
    },
  });

  // Mark request as suspended mutation
  const markSuspendedMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return await apiRequest(`/api/requests/${id}/mark-suspended`, "PATCH", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/urgent"] });
      setSuspensionModalOpen(false);
      setSuspensionReason("");
      setSelectedRequestForSuspension(null);
      toast({
        title: "Requisição marcada como suspenso",
        description: "A requisição foi marcada como suspenso com sucesso.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Você será redirecionado para fazer login novamente.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      console.error("Error marking request as suspended:", error);
      toast({
        title: "Erro",
        description: "Falha ao marcar requisição como suspenso.",
        variant: "destructive",
      });
    },
  });

  // Complete request mutation
  const completeRequestMutation = useMutation({
    mutationFn: async ({ id, examLocation, examDate, examTime, resultFile }: { 
      id: number; 
      examLocation: string; 
      examDate: string; 
      examTime: string; 
      resultFile: File 
    }) => {
      const formData = new FormData();
      formData.append('examLocation', examLocation);
      formData.append('examDate', examDate);
      formData.append('examTime', examTime);
      formData.append('resultFile', resultFile);
      return await apiRequest(`/api/requests/${id}/complete`, "POST", formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      // Gerar mensagem do WhatsApp
      if (selectedRequestForCompletion) {
        const patient = selectedRequestForCompletion.patient;
        const serviceName = selectedRequestForCompletion.examType?.name || selectedRequestForCompletion.consultationType?.name;

        // Gerar URL do resultado (PDF) que será gerado após conclusão
        const resultUrl = `${window.location.origin}/api/requests/${selectedRequestForCompletion.id}/view-result`;

        // Format date correctly to avoid timezone issues
        const dateParts = examDate.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        const message = `🏥 *Prefeitura Municipal de Alexandria/RN*
*Setor de Regulação*

Olá ${patient?.name}!

Sua requisição de ${serviceName} foi aprovada.

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${examTime}
📍 *Local:* ${examLocation}

📄 *Resultado da solicitação disponível em:*

${resultUrl}

*📋 Documentos necessários no dia do exame:*
• Xerox de Identidade (RG ou CNH)
• Cópia da requisição
• Cópia do cartão SUS
• Requisição do médico
• Comprovante de residência

*Importante:*
• Chegue com 30 minutos de antecedência
• Traga documento com foto original
• Em caso de impedimento, comunique com antecedência

Atenciosamente,
Secretaria de Saúde de Alexandria/RN`;

        const phoneNumber = patient?.phone?.replace(/\D/g, '') || '';
        const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;

        // Abrir WhatsApp
        window.open(whatsappUrl, '_blank');
      }

      setCompletionModalOpen(false);
      setExamLocation("");
      setExamDate("");
      setExamTime("");
      setResultFile(null);
      setSelectedRequestForCompletion(null);
      toast({
        title: "Requisição concluída",
        description: "A requisição foi concluída e o WhatsApp foi aberto para notificar o paciente.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Você será redirecionado para fazer login novamente.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      console.error("Error completing request:", error);
      toast({
        title: "Erro",
        description: "Falha ao concluir requisição.",
        variant: "destructive",
      });
    },
  });

  // Delete suspended request mutation
  const deleteSuspendedMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/requests/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/urgent"] });
      toast({
        title: "Requisição deletada",
        description: "A requisição suspensa foi deletada com sucesso.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Você será redirecionado para fazer login novamente.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      console.error("Error deleting suspended request:", error);
      toast({
        title: "Erro",
        description: "Falha ao deletar requisição suspensa.",
        variant: "destructive",
      });
    },
  });

  // Notification mutations
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      return apiRequest('/api/notifications', 'POST', notificationData);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Notificação criada com sucesso"
      });
      refetchNotifications();
      setIsNotificationModalOpen(false);
      setNotificationForm({
        title: '',
        message: '',
        type: 'info',
        targetRole: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar notificação",
        variant: "destructive"
      });
    }
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest(`/api/notifications/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Notificação atualizada com sucesso"
      });
      refetchNotifications();
      setEditingNotification(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar notificação",
        variant: "destructive"
      });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/notifications/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Notificação excluída com sucesso"
      });
      refetchNotifications();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir notificação",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDeleteSuspended = (id: number) => {
    const confirmed = confirm("Tem certeza que deseja deletar esta requisição suspensa? Esta ação não pode ser desfeita.");
    if (confirmed) {
      deleteSuspendedMutation.mutate(id);
    }
  };

  const handleResendWhatsApp = (request: any) => {
    const patient = request.patient;
    const serviceName = request.examType?.name || request.consultationType?.name;

    // Gerar URL do resultado (PDF)
    const resultUrl = `${window.location.origin}/api/requests/${request.id}/view-result`;

    // Format date correctly to avoid timezone issues
    const dateParts = request.examDate?.split('-') || [];
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : request.examDate;

    const message = `🏥 *Prefeitura Municipal de Alexandria/RN*
*Setor de Regulação*

Olá ${patient?.name}!

Sua requisição de ${serviceName} foi aprovada.

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${request.examTime}
📍 *Local:* ${request.examLocation}

📄 *Resultado da solicitação disponível em:*

${resultUrl}

*📋 Documentos necessários no dia do exame:*
• Xerox de Identidade (RG ou CNH)
• Cópia da requisição
• Cópia do cartão SUS
• Requisição do médico
• Comprovante de residência

*Importante:*
• Chegue com 30 minutos de antecedência
• Traga documento com foto original
• Em caso de impedimento, comunique com antecedência

Atenciosamente,
Secretaria de Saúde de Alexandria/RN`;

    const phoneNumber = patient?.phone?.replace(/\D/g, '') || '';
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;

    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');

    toast({
      title: "WhatsApp enviado",
      description: "O WhatsApp foi aberto com a mensagem para o paciente.",
    });
  };

  const handleCompleteRequest = (request: any) => {
    setSelectedRequestForCompletion(request);
    setCompletionModalOpen(true);
  };

  const handleSuspendRequest = (request: any) => {
    setSelectedRequestForSuspension(request);
    setSuspensionModalOpen(true);
  };

  const handleSubmitSuspension = () => {
    if (!selectedRequestForSuspension || !suspensionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "É necessário informar o motivo da suspensão.",
        variant: "destructive",
      });
      return;
    }

    markSuspendedMutation.mutate({
      id: selectedRequestForSuspension.id,
      reason: suspensionReason.trim()
    });
  };

  // Reset notification form
  const resetNotificationForm = () => {
    setNotificationForm({
      title: '',
      message: '',
      type: 'info',
      targetRole: ''
    });
    setEditingNotification(null);
    setIsNotificationModalOpen(false);
  };

  // Handle notification form submission
  const handleNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message) {
      toast({
        title: "Erro",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingNotification) {
      updateNotificationMutation.mutate({
        id: editingNotification.id,
        ...notificationForm
      });
    } else {
      createNotificationMutation.mutate(notificationForm);
    }
  };

  const handleFileSelect = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = (requestId: number, file: File) => {
    if (requestId && file) {
      uploadMutation.mutate({ requestId, file });
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedRequestForCompletion || !examLocation || !examDate || !examTime || !resultFile) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e anexe o arquivo de resultado.",
        variant: "destructive",
      });
      return;
    }

    completeRequestMutation.mutate({
      id: selectedRequestForCompletion.id,
      examLocation,
      examDate,
      examTime,
      resultFile,
    });
  };

  const getStatusBadge = (status: string, isUrgent: boolean) => {
    const urgentClass = isUrgent ? "border-red-500 bg-red-50" : "";

    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className={`${urgentClass}`}>Aguardando Análise</Badge>;
      case 'received':
        return <Badge variant="secondary" className={`bg-gray-500 ${urgentClass}`}>Recebida</Badge>;
      case 'accepted':
        return <Badge variant="default" className={`bg-blue-600 ${urgentClass}`}>Aceita</Badge>;
      case 'confirmed':
        return <Badge variant="default" className={`bg-green-600 ${urgentClass}`}>Confirmada</Badge>;
      case 'completed':
        return <Badge variant="default" className={`bg-purple-600 ${urgentClass}`}>Concluída</Badge>;
      default:
        return <Badge variant="secondary" className={`${urgentClass}`}>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel de Regulação</h1>
          <p className="text-gray-600">
            Bem-vindo, {(user as any)?.firstName} {(user as any)?.lastName} ({(user as any)?.username})
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Auto-refresh controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
                queryClient.invalidateQueries({ queryKey: ['/api/requests/urgent'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
                toast({
                  title: "Dados atualizados",
                  description: "Informações do painel foram atualizadas.",
                });
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Agora
            </Button>
            <Button
              variant={autoRefreshEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefreshEnabled ? 'animate-spin' : ''}`} />
              {autoRefreshEnabled ? 'Auto: ON' : 'Auto: OFF'}
            </Button>
            <div className="text-xs text-gray-500">
              {autoRefreshEnabled ? (
                <span>A cada 10s</span>
              ) : (
                <span>Manual</span>
              )}
            </div>
          </div>
          <ChangePasswordModal />
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/api/logout'}
          >
            <X className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      <NotificationBanner />

      {/* Urgent Requests Alert */}
      {Array.isArray(urgentRequests) && urgentRequests.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="mr-2" size={20} />
              Requisições Urgentes ({urgentRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Solicitação</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anexo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urgentRequests.map((request: any) => (
                    <TableRow key={request.id} className="bg-white">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div>
                            <button 
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                              onClick={() => setSelectedPatientId(request.patient?.id)}
                            >
                              {request.patient?.name}
                            </button>
                            <div className="text-sm text-gray-500">
                              {request.patient?.age} anos • {request.patient?.cpf}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {request.examType?.name || request.consultationType?.name}
                          </span>
                          {(() => {
                            const serviceName = request.examType?.name || request.consultationType?.name;
                            const quotaInfo = getQuotaInfo(serviceName);
                            if (quotaInfo.quota > 0) {
                              const isLow = quotaInfo.remaining <= 5;
                              const isFull = quotaInfo.remaining === 0;
                              return (
                                <span className={`text-xs mt-1 ${isFull ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {quotaInfo.used}/{quotaInfo.quota} ({quotaInfo.remaining} disponível)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {request.doctor?.firstName} {request.doctor?.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status, request.isUrgent)}
                      </TableCell>
                      <TableCell className="text-center">
                        {request.attachmentFileName ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="p-2 h-8 w-8"
                                title={`Ver anexo: ${request.attachmentFileName}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                              <DialogHeader>
                                <DialogTitle>Arquivo Anexado - {request.attachmentFileName}</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col space-y-4">
                                <div className="flex-1 overflow-auto">
                                  <img 
                                    src={`/api/requests/${request.id}/view-attachment`}
                                    alt="Anexo da requisição"
                                    className="w-full h-auto max-h-[60vh] object-contain border rounded"
                                    style={{ maxWidth: '100%' }}
                                  />
                                </div>
                                <div className="flex justify-center">
                                  <Button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = `/api/requests/${request.id}/download-attachment`;
                                      link.download = request.attachmentFileName || `anexo-${request.id}`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="flex items-center space-x-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>Baixar Arquivo</span>
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {(request.status === 'pending' || request.status === 'received') && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStatusChange(request.id, 'accepted')}
                              disabled={updateStatusMutation.isPending}
                            >
                              Aceitar
                            </Button>
                          )}
                          {request.status === 'accepted' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStatusChange(request.id, 'confirmed')}
                              disabled={updateStatusMutation.isPending}
                            >
                              Confirmar
                            </Button>
                          )}
                          {request.status === 'confirmed' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleCompleteRequest(request)}
                              disabled={updateStatusMutation.isPending}
                            >
                              Concluir
                            </Button>
                          )}
                          {(user as any)?.role === 'regulacao' && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleSuspendRequest(request)}
                              disabled={markSuspendedMutation.isPending}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <Hand className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspended Requests Section */}
      {suspendedRequests.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="mr-2" size={20} />
              Requisições Suspensas ({suspendedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspendedRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setSelectedPatientId(request.patient.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {request.patient.name}
                      </button>
                      <span className="text-sm text-gray-600">CPF: {request.patient.cpf}</span>
                      <span className="text-sm font-medium text-red-600">
                        {request.examType?.name || request.consultationType?.name}
                      </span>
                      {request.notes && (
                        <span className="text-xs text-gray-500 italic">
                          Motivo: {request.notes}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Data: {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteSuspended(request.id)}
                      disabled={deleteSuspendedMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Deletar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Recebidas</p>
                <p className="text-2xl font-semibold text-gray-900">{(stats as any)?.received || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Aceitas</p>
                <p className="text-2xl font-semibold text-gray-900">{(stats as any)?.accepted || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="text-yellow-600" size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-semibold text-gray-900">{(stats as any)?.confirmed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="text-purple-600" size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Concluídas</p>
                <p className="text-2xl font-semibold text-gray-900">{(stats as any)?.completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Requisições</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">
                Requisições Ativas ({activeRequests.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Requisições Concluídas ({completedRequests.length >= 100 ? '100+' : completedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="patients">
                Pacientes
              </TabsTrigger>
              <TabsTrigger value="notifications">
                Notificações
              </TabsTrigger>
            </TabsList>

            {/* Filter Controls */}
            <div className="flex items-center gap-4 mt-4 mb-4">
              <div className="flex items-center gap-2">
                <label htmlFor="type-filter" className="text-sm font-medium text-gray-700">
                  Filtrar por tipo:
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {uniqueTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {typeFilter !== "todos" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTypeFilter("todos")}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpar filtro
                </Button>
              )}
            </div>

            <TabsContent value="active" className="mt-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Solicitação</TableHead>
                      <TableHead>Atendente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Anexo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(activeRequests) && activeRequests.length > 0 ? activeRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">

                            <div>
                              <button 
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                                onClick={() => setSelectedRequestForFiles(request)}
                              >
                                {request.patient?.name}
                              </button>
                              <div className="text-sm text-gray-500">
                                {request.patient?.age} anos • {request.patient?.cpf}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {request.examType?.name || request.consultationType?.name}
                            </span>
                            {(() => {
                              const serviceName = request.examType?.name || request.consultationType?.name;
                              const quotaInfo = getQuotaInfo(serviceName);
                              if (quotaInfo.quota > 0) {
                                const isLow = quotaInfo.remaining <= 5;
                                const isFull = quotaInfo.remaining === 0;
                                return (
                                  <span className={`text-xs mt-1 ${isFull ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {quotaInfo.used}/{quotaInfo.quota} ({quotaInfo.remaining} disponível)
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {request.doctor?.firstName} {request.doctor?.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status, request.isUrgent)}
                        </TableCell>
                        <TableCell className="text-center">
                          {request.attachmentFileName ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="p-2 h-8 w-8"
                                  title={`Ver anexo: ${request.attachmentFileName}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                                <DialogHeader>
                                  <DialogTitle>Arquivo Anexado - {request.attachmentFileName}</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col space-y-4">
                                  <div className="flex-1 overflow-auto">
                                    <img 
                                      src={`/api/requests/${request.id}/view-attachment`}
                                      alt="Anexo da requisição"
                                      className="w-full h-auto max-h-[60vh] object-contain border rounded"
                                      style={{ maxWidth: '100%' }}
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <Button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `/api/requests/${request.id}/download-attachment`;
                                        link.download = request.attachmentFileName || `anexo-${request.id}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="flex items-center space-x-2"
                                    >
                                      <Download className="w-4 h-4" />
                                      <span>Baixar Arquivo</span>
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {(request.status === 'received' || request.status === 'pending') && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusChange(request.id, 'accepted')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Aceitar
                              </Button>
                            )}
                            {request.status === 'accepted' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusChange(request.id, 'confirmed')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Confirmar
                              </Button>
                            )}
                            {request.status === 'confirmed' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleCompleteRequest(request)}
                                disabled={updateStatusMutation.isPending}
                              >
                                Concluir
                              </Button>
                            )}
                            {(user as any)?.role === 'regulacao' && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleSuspendRequest(request)}
                                disabled={markSuspendedMutation.isPending}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Hand className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-gray-500">Nenhuma requisição ativa encontrada</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Solicitação</TableHead>
                      <TableHead>Atendente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Anexo</TableHead>
                      <TableHead>Resultados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">

                            <div>
                              <button 
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                                onClick={() => setSelectedRequestForFiles(request)}
                              >
                                {request.patient?.name}
                              </button>
                              <div className="text-sm text-gray-500">
                                {request.patient?.age} anos • {request.patient?.cpf}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {request.examType?.name || request.consultationType?.name}
                            </span>
                            {(() => {
                              const serviceName = request.examType?.name || request.consultationType?.name;
                              const quotaInfo = getQuotaInfo(serviceName);
                              if (quotaInfo.quota > 0) {
                                const isLow = quotaInfo.remaining <= 5;
                                const isFull = quotaInfo.remaining === 0;
                                return (
                                  <span className={`text-xs mt-1 ${isFull ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {quotaInfo.used}/{quotaInfo.quota} ({quotaInfo.remaining} disponível)
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {request.doctor?.firstName} {request.doctor?.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status, request.isUrgent)}
                        </TableCell>
                        <TableCell className="text-center">
                          {request.attachmentFileName ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="p-2 h-8 w-8"
                                  title={`Ver anexo: ${request.attachmentFileName}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                                <DialogHeader>
                                  <DialogTitle>Arquivo Anexado - {request.attachmentFileName}</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col space-y-4">
                                  <div className="flex-1 overflow-auto">
                                    <img 
                                      src={`/api/requests/${request.id}/view-attachment`}
                                      alt="Anexo da requisição"
                                      className="w-full h-auto max-h-[60vh] object-contain border rounded"
                                      style={{ maxWidth: '100%' }}
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <Button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `/api/requests/${request.id}/download-attachment`;
                                        link.download = request.attachmentFileName || `anexo-${request.id}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="flex items-center space-x-2"
                                    >
                                      <Download className="w-4 h-4" />
                                      <span>Baixar Arquivo</span>
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {request.resultFileName && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `/api/requests/${request.id}/download-result`;
                                  link.download = request.resultFileName || `resultado-${request.id}`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="flex items-center space-x-2"
                              >
                                <Download className="w-4 h-4" />
                                <span>Baixar</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendWhatsApp(request)}
                              className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.087z"/>
                              </svg>
                              <span>WhatsApp</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {completedRequests.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma requisição concluída encontrada</p>
                  </div>
                )}

                {/* Info about limit */}
                {completedRequests.length >= 100 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Exibindo as 100 requisições concluídas mais recentes.</span> 
                      {' '}Para ver requisições mais antigas, use os filtros de data no painel administrativo.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="mt-6">
              {((user as any)?.role === 'admin' || (user as any)?.role === 'regulacao') ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium">Gerenciar Notificações</h3>
                      <p className="text-sm text-gray-600">Crie e gerencie notificações para os usuários do sistema</p>
                    </div>
                    <Button 
                      onClick={() => setIsNotificationModalOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Notificação
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {notifications && notifications.length > 0 ? (
                      notifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{notification.title}</h3>
                              <Badge 
                                variant={notification.type === 'error' ? 'destructive' : 
                                       notification.type === 'warning' ? 'default' : 'secondary'}
                              >
                                {notification.type}
                              </Badge>
                              {notification.targetRole && (
                                <Badge variant="outline">
                                  {notification.targetRole}
                                </Badge>
                              )}
                              <span className={`text-sm ${notification.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                {notification.isActive ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            <p className="text-xs text-gray-400">
                              Criado em: {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingNotification(notification);
                                setNotificationForm({
                                  title: notification.title,
                                  message: notification.message,
                                  type: notification.type,
                                  targetRole: notification.targetRole || ''
                                });
                                setIsNotificationModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhuma notificação criada ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Acesso restrito a administradores e regulação.</p>
                </div>
              )}
            </TabsContent>

            {/* Patient Search Tab */}
            <TabsContent value="patients" className="mt-6">
              <div className="space-y-6">
                {/* Search Input */}
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome ou CPF do paciente..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={handlePatientSearch}
                    disabled={isSearching}
                    className="flex items-center space-x-2"
                    variant="outline"
                  >
                    {isSearching ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>{isSearching ? 'Buscando...' : 'Atualizar'}</span>
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Idade</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Unidade de Saúde</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((patient: any) => (
                          <TableRow key={patient.id}>
                            <TableCell>
                              <button
                                className="text-blue-600 hover:text-blue-800 font-medium underline"
                                onClick={() => setSelectedPatientId(patient.id)}
                              >
                                {patient.name}
                              </button>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {patient.cpf}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {patient.age} anos
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {patient.phone || 'Não informado'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {patient.healthUnit?.name || 'Não informado'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPatientId(patient.id)}
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Detalhes</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Loading State */}
                {isSearching && (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-500">Buscando pacientes...</p>
                  </div>
                )}

                {/* Empty State */}
                {!isSearching && searchResults.length === 0 && patientSearchTerm && patientSearchTerm.length >= 2 && (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum paciente encontrado</p>
                    <p className="text-sm text-gray-400">
                      Tente buscar por nome completo ou CPF
                    </p>
                  </div>
                )}

                {/* Initial State */}
                {!patientSearchTerm && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Digite o nome ou CPF do paciente (mínimo 2 caracteres)</p>
                    <p className="text-sm text-gray-400">A busca será feita automaticamente conforme você digita</p>
                  </div>
                )}

                {/* Minimum characters message */}
                {patientSearchTerm && patientSearchTerm.length < 2 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">Digite pelo menos 2 caracteres para buscar</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Patient Details Modal */}
      <PatientDetailsModal
        isOpen={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
        patientId={selectedPatientId || 0}
      />

      {/* Enhanced Patient Details Modal with Files */}
      <PatientDetailsModal
        isOpen={!!selectedRequestForFiles}
        onClose={() => setSelectedRequestForFiles(null)}
        patientId={selectedRequestForFiles?.patient?.id || 0}
        selectedRequest={selectedRequestForFiles}
      />

      {/* Completion Modal */}
      <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="completion-modal-description">
          <DialogHeader>
            <DialogTitle>Concluir Requisição</DialogTitle>
            <p id="completion-modal-description" className="text-sm text-gray-600">
              Preencha as informações do agendamento para enviar via WhatsApp
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRequestForCompletion && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {selectedRequestForCompletion.patient?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedRequestForCompletion.examType?.name || selectedRequestForCompletion.consultationType?.name}
                </p>
                <p className="text-sm text-gray-500">
                  Tel: {selectedRequestForCompletion.patient?.phone}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="examLocation" className="block text-sm font-medium text-gray-700 mb-1">
                  Local do Exame/Consulta *
                </label>
                <Input
                  id="examLocation"
                  type="text"
                  value={examLocation}
                  onChange={(e) => setExamLocation(e.target.value)}
                  placeholder="Ex: Hospital Municipal"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="examDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <Input
                  id="examDate"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="examTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Horário *
                </label>
                <Input
                  id="examTime"
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="resultFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload da Cópia do Resultado *
                </label>
                <Input
                  id="resultFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setResultFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                {resultFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Arquivo selecionado: {resultFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCompletionModalOpen(false);
                  setExamLocation("");
                  setExamDate("");
                  setExamTime("");
                  setResultFile(null);
                  setSelectedRequestForCompletion(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendWhatsApp}
                disabled={!examLocation || !examDate || !examTime || !resultFile || completeRequestMutation.isPending}
                className="flex-1"
              >
                {completeRequestMutation.isPending ? "Enviando..." : "Enviar WhatsApp"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de suspensão */}
      <Dialog open={suspensionModalOpen} onOpenChange={setSuspensionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Hand className="w-5 h-5 text-red-600" />
              <span>Marcar Requisição como Suspenso</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Motivo da suspensão *
              </label>
              <Input
                type="text"
                placeholder="Descreva o motivo da suspensão..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSuspensionModalOpen(false);
                  setSuspensionReason("");
                  setSelectedRequestForSuspension(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmitSuspension}
                disabled={!suspensionReason.trim() || markSuspendedMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {markSuspendedMutation.isPending ? "Marcando..." : "Marcar como Suspenso"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Form Modal */}
      <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingNotification ? 'Editar Notificação' : 'Nova Notificação'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNotificationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  title: e.target.value
                })}
                placeholder="Título da notificação"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  message: e.target.value
                })}
                placeholder="Conteúdo da notificação"
                rows={4}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={notificationForm.type} 
                  onValueChange={(value) => setNotificationForm({
                    ...notificationForm,
                    type: value as 'info' | 'warning' | 'error' | 'success'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="targetRole">Público-alvo</Label>
                <Select 
                  value={notificationForm.targetRole} 
                  onValueChange={(value) => setNotificationForm({
                    ...notificationForm,
                    targetRole: value === 'todos' ? '' : value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o público" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="regulacao">Regulação</SelectItem>
                    <SelectItem value="recepcao">Recepção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetNotificationForm}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createNotificationMutation.isPending || updateNotificationMutation.isPending}
              >
                {createNotificationMutation.isPending || updateNotificationMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {editingNotification ? 'Atualizar' : 'Criar'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sistema de documentos removido conforme solicitado */}
    </div>
  );
}