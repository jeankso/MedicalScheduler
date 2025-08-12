import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, User, X, DollarSign, Activity, TrendingUp, BarChart3, Eye, ChevronLeft, ChevronRight, Shield, Users, Settings, Hospital, UserPlus, TestTubeDiagonal, Stethoscope, Plus, Edit, Trash2, FileBarChart, Phone, MapPin, Download, RefreshCw, Database, Bell, BellOff, MessageSquare, EyeOff, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import BackupRestore from "@/pages/BackupRestore";
import PatientDetailsModal from "@/components/PatientDetailsModal";
import NotificationBanner from "@/components/NotificationBanner";



export default function UnifiedPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  
  // Global date filter - single source of truth for all tabs
  const currentDate = new Date();
  const [globalMonth, setGlobalMonth] = useState<number>(currentDate.getMonth() + 1);
  const [globalYear, setGlobalYear] = useState<number>(currentDate.getFullYear());

  // Notification states
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success',
    targetRole: ''
  });
  const [editingNotification, setEditingNotification] = useState<any>(null);
  

  
  // Duplicate detection state
  const [duplicateRequests, setDuplicateRequests] = useState<any[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  
  // Patient details modal state
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [procedurePatients, setProcedurePatients] = useState<any[]>([]);

  // Forward request modal state
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardingRequest, setForwardingRequest] = useState<any>(null);
  const [forwardMonth, setForwardMonth] = useState<string>('');
  const [forwardYear, setForwardYear] = useState<string>('');
  const [forwardReason, setForwardReason] = useState<string>('');

  // Patient search states
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isPatientDetailModalOpen, setIsPatientDetailModalOpen] = useState(false);
  
  // Patient modal states (for clicking on patient names)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  // Bulk approval states
  const [selectedRequestsForApproval, setSelectedRequestsForApproval] = useState<Set<number>>(new Set());
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);
  
  // Show received requests toggle
  const [showReceivedRequests, setShowReceivedRequests] = useState(false);

  // Suspended requests states
  const [showSuspendedRequests, setShowSuspendedRequests] = useState(false);

  // Batch forwarding states
  const [selectedRequestsForBatchForward, setSelectedRequestsForBatchForward] = useState<Set<number>>(new Set());
  const [isBatchForwardModalOpen, setIsBatchForwardModalOpen] = useState(false);
  const [batchForwardMonth, setBatchForwardMonth] = useState<string>('');
  const [batchForwardYear, setBatchForwardYear] = useState<string>('');
  const [batchForwardReason, setBatchForwardReason] = useState<string>('');

  // Delete confirmation states
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    requestId: number | null;
    patientName: string;
  }>({
    isOpen: false,
    requestId: null,
    patientName: ''
  });



  // Check if user has admin or secretary access
  const isAdmin = (user as any)?.role === 'admin';
  const isSecretary = (user as any)?.role === 'regulacao';
  const hasAccess = isAdmin || isSecretary;

  // Fetch ALL requests data (no date filter) for the main requests tab
  const { data: allRequests } = useQuery({
    queryKey: ['/api/requests', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/requests');
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
    },
    enabled: isAuthenticated && hasAccess,
  });

  // Fetch requests data for reports using global filter (for dashboard/reports only)
  const { data: filteredRequests } = useQuery({
    queryKey: ['/api/requests', globalYear, globalMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('year', globalYear.toString());
      params.append('month', globalMonth.toString());
      
      const response = await fetch(`/api/requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
    },
    enabled: isAuthenticated && hasAccess,
  });



  // Fetch secretary pending requests using global filter
  const { data: secretaryRequestsForReports, error: secretaryRequestsError } = useQuery({
    queryKey: ['/api/secretary/pending-requests', 'reports', showReceivedRequests ? 'with-received' : 'pending-only', globalMonth, globalYear, 'smart-filtering'],
    queryFn: async () => {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // JS months are 0-indexed
      const currentYear = currentDate.getFullYear();
      
      // Determine if selected month is in the future
      const selectedDate = new Date(globalYear, globalMonth - 1);
      const currentDateForComparison = new Date(currentYear, currentMonth - 1);
      const isFutureMonth = selectedDate > currentDateForComparison;
      
      let url;
      if (showReceivedRequests) {
        // Include received requests from current month
        url = `/api/secretary/pending-requests?month=${globalMonth}&year=${globalYear}&includeReceived=${showReceivedRequests}`;
      } else if (isFutureMonth) {
        // For future months: show ONLY requests specifically forwarded to that month
        url = `/api/secretary/pending-requests?month=${globalMonth}&year=${globalYear}&includeReceived=false&futureMonthOnly=true`;
      } else {
        // For current/past months: show all pending requests from all months
        url = `/api/secretary/pending-requests?includeReceived=false&allMonths=true`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      
      return data;
    },
    enabled: isAuthenticated && hasAccess,
    staleTime: 0, // Force fresh data
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Fetch notifications
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated && isAdmin,
  });

  // Fetch patients for search
  const { data: patients, refetch: refetchPatients } = useQuery({
    queryKey: ['/api/patients/search', patientSearchQuery],
    queryFn: async () => {
      if (!patientSearchQuery.trim()) return [];
      
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(patientSearchQuery)}`);
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    },
    enabled: isAuthenticated && isAdmin && patientSearchQuery.trim().length > 0,
  });

  // Fetch suspended requests
  const { data: suspendedRequests = [] } = useQuery({
    queryKey: ['/api/requests/suspended'],
    enabled: isAuthenticated && hasAccess && showSuspendedRequests,
    staleTime: 0,
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

  const toggleNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/notifications/${id}/toggle`, 'PATCH');
    },
    onSuccess: () => {
      refetchNotifications();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status da notificação",
        variant: "destructive"
      });
    }
  });

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

  // Auto-refresh functionality for regulation and administration panels
  useEffect(() => {
    if (!autoRefreshEnabled || !isAuthenticated || !user) return;

    // Only enable auto-refresh for regulation and admin roles
    if ((user as any)?.role !== 'regulacao' && (user as any)?.role !== 'admin') return;

    const interval = setInterval(() => {
      // Refresh main data queries
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/requests/urgent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/secretary/pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/secretary/dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/secretary/recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
      setLastRefreshTime(new Date());
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, isAuthenticated, user, queryClient]);

  // Component para a aba de exames e consultas
  const ExamsTabImplementation = () => {
    const [deleteExamId, setDeleteExamId] = useState<number | null>(null);

    // Buscar todos os procedimentos (exames e consultas)
    const { data: completedProcedures, isLoading: loadingExams, refetch } = useQuery({
      queryKey: ['/api/requests', 'all'],
      queryFn: async () => {
        const response = await fetch('/api/requests');
        if (!response.ok) throw new Error('Erro ao buscar procedimentos');
        return response.json();
      }
    });

    // Mutation para deletar exame
    const deleteExamMutation = useMutation({
      mutationFn: async (requestId: number) => {
        const response = await fetch(`/api/requests/${requestId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erro ao excluir procedimento');
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Procedimento excluído com sucesso"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
        refetch();
        setDeleteExamId(null);
      },
      onError: (error: any) => {
        toast({
          title: "Erro",
          description: error.message || "Erro ao excluir exame",
          variant: "destructive"
        });
      }
    });

    const handleDeleteExam = (requestId: number) => {
      setDeleteExamId(requestId);
    };

    const confirmDeleteExam = () => {
      if (deleteExamId) {
        deleteExamMutation.mutate(deleteExamId);
      }
    };

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value / 100);
    };

    if (loadingExams) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Carregando exames...</p>
          </div>
        </div>
      );
    }

    const exams = Array.isArray(completedProcedures) ? completedProcedures : [];

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Procedimentos Finalizados</h3>
            <p className="text-sm text-gray-600">
              Total de {exams.length} procedimentos realizados (exames e consultas)
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum procedimento finalizado encontrado</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam: any) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">#{exam.id}</TableCell>
                    <TableCell>{exam.patient?.name || 'N/A'}</TableCell>
                    <TableCell>{exam.patient?.cpf || 'N/A'}</TableCell>
                    <TableCell>
                      {exam.examType?.name || exam.consultationType?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {exam.doctor ? `${exam.doctor.firstName} ${exam.doctor.lastName}` : 'N/A'}
                    </TableCell>
                    <TableCell>{exam.healthUnit?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {exam.createdAt ? format(new Date(exam.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {exam.examType?.price || exam.consultationType?.price ? 
                        formatCurrency(exam.examType?.price || exam.consultationType?.price) : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteExam(exam.id)}
                        disabled={deleteExamMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={deleteExamId !== null} onOpenChange={() => setDeleteExamId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteExam}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteExamMutation.isPending}
              >
                {deleteExamMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  // Filter functions
  const filterDataByMonth = (data: any[]) => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(item => {
      const createdAt = new Date(item.createdAt);
      const itemMonth = createdAt.getMonth() + 1; // JavaScript months are 0-based, so add 1
      const itemYear = createdAt.getFullYear();
      
      return itemMonth === globalMonth && itemYear === globalYear;
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Start from 2025 and go up to 2029
    for (let i = 2025; i <= 2029; i++) {
      years.push(i);
    }
    return years;
  };

  // Admin form states
  const [newHealthUnit, setNewHealthUnit] = useState({ name: "", address: "", phone: "" });
  const [newExamType, setNewExamType] = useState({ name: "", description: "", monthlyQuota: "", price: "", needsSecretaryApproval: false });
  const [newConsultationType, setNewConsultationType] = useState({ name: "", description: "", monthlyQuota: "", price: "", needsSecretaryApproval: false });
  const [newUser, setNewUser] = useState({ 
    username: "", 
    password: "", 
    email: "", 
    firstName: "", 
    lastName: "", 
    role: "recepcao", 
    healthUnitId: "" 
  });

  // Modal states
  const [showHealthUnitDialog, setShowHealthUnitDialog] = useState(false);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [showConsultationDialog, setShowConsultationDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditHealthUnitModal, setShowEditHealthUnitModal] = useState(false);
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [showEditConsultationModal, setShowEditConsultationModal] = useState(false);
  const [editHealthUnit, setEditHealthUnit] = useState<any>(null);
  const [editExamType, setEditExamType] = useState<any>(null);
  const [editConsultationType, setEditConsultationType] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);

  // Redirect if not authorized
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !hasAccess)) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    }
  }, [isAuthenticated, hasAccess, isLoading, toast]);

  // Helper functions
  const getCurrentMonthName = (year: number, month: number) => {
    const date = new Date(year, month);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  const calculateTotalSpending = (spendingData: any[]) => {
    return spendingData.reduce((total, item) => total + (item.totalSpent || 0), 0);
  };

  const formatLogDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setIsCurrentMonth(true);
  };

  // Queries using global filter
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats", globalYear, globalMonth],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/stats?year=${globalYear}&month=${globalMonth}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: isAuthenticated && hasAccess,
  });

  const { data: healthUnits } = useQuery({
    queryKey: ["/api/health-units"],
    enabled: isAuthenticated && hasAccess,
  });

  const { data: examTypes } = useQuery({
    queryKey: ["/api/exam-types"],
    enabled: isAuthenticated && hasAccess,
  });

  const { data: consultationTypes } = useQuery({
    queryKey: ["/api/consultation-types"],
    enabled: isAuthenticated && hasAccess,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && hasAccess,
  });

  const { data: quotaUsage } = useQuery({
    queryKey: ["/api/dashboard/quota-usage", globalYear, globalMonth],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/quota-usage?year=${globalYear}&month=${globalMonth}`);
      if (!response.ok) throw new Error('Failed to fetch quota usage');
      return response.json();
    },
    enabled: isAuthenticated && hasAccess,
  });

  const { data: spendingData } = useQuery({
    queryKey: ["/api/dashboard/spending", globalYear, globalMonth],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/spending?year=${globalYear}&month=${globalMonth}`);
      if (!response.ok) throw new Error('Failed to fetch spending data');
      return response.json();
    },
    enabled: isAuthenticated && hasAccess,
  });

  const { data: availableMonths } = useQuery({
    queryKey: ["/api/dashboard/available-months"],
    enabled: isAuthenticated && hasAccess,
  });

  // Note: Removed duplicate pendingRequests query that was causing cache conflicts
  // Now only using secretaryRequestsForReports for pending requests data

  const { data: activityLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
    enabled: isAuthenticated && hasAccess,
  });

  const { data: monthlyReport, isLoading: isLoadingReport } = useQuery({
    queryKey: ["/api/reports/monthly-authorizations", globalYear, globalMonth],
    queryFn: async () => {
      const response = await fetch(`/api/reports/monthly-authorizations?year=${globalYear}&month=${globalMonth}`);
      if (!response.ok) throw new Error('Failed to fetch monthly report');
      return response.json();
    },
    enabled: isAuthenticated && hasAccess,
  });

  // Secretary specific queries
  const { data: secretaryStats } = useQuery({
    queryKey: ["/api/secretary/dashboard/stats"],
    enabled: isAuthenticated && isSecretary,
  });

  const { data: secretaryQuotaUsage } = useQuery({
    queryKey: ["/api/secretary/dashboard/quota-usage", globalYear, globalMonth],
    queryFn: async () => {
      const response = await fetch(`/api/secretary/dashboard/quota-usage?year=${globalYear}&month=${globalMonth}`);
      if (!response.ok) throw new Error('Failed to fetch secretary quota usage');
      return response.json();
    },
    enabled: isAuthenticated && isSecretary,
  });

  const { data: secretarySpendingData } = useQuery({
    queryKey: ["/api/secretary/dashboard/spending", globalYear, globalMonth],
    queryFn: async () => {
      const response = await fetch(`/api/secretary/dashboard/spending?year=${globalYear}&month=${globalMonth}`);
      if (!response.ok) throw new Error('Failed to fetch secretary spending data');
      return response.json();
    },
    enabled: isAuthenticated && hasAccess, // Allow both admin and secretary to access
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/secretary/dashboard/recent-activity"],
    enabled: isAuthenticated && isSecretary,
  });

  // Mutations
  const createHealthUnitMutation = useMutation({
    mutationFn: async (healthUnit: typeof newHealthUnit) => {
      return await apiRequest("/api/health-units", "POST", healthUnit);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Unidade de saúde criada com sucesso!",
      });
      setNewHealthUnit({ name: "", address: "", phone: "" });
      setShowHealthUnitDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/health-units"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao criar unidade de saúde.",
        variant: "destructive",
      });
    },
  });

  const createExamTypeMutation = useMutation({
    mutationFn: async (examType: typeof newExamType) => {
      return await apiRequest("/api/exam-types", "POST", {
        ...examType,
        monthlyQuota: parseInt(examType.monthlyQuota),
        price: parseFloat(examType.price) * 100,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Tipo de exame criado com sucesso!",
      });
      setNewExamType({ name: "", description: "", monthlyQuota: "", price: "", needsSecretaryApproval: false });
      setShowExamDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao criar tipo de exame.",
        variant: "destructive",
      });
    },
  });

  const createConsultationTypeMutation = useMutation({
    mutationFn: async (consultationType: typeof newConsultationType) => {
      return await apiRequest("/api/consultation-types", "POST", {
        ...consultationType,
        monthlyQuota: parseInt(consultationType.monthlyQuota),
        price: parseFloat(consultationType.price) * 100,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Tipo de consulta criado com sucesso!",
      });
      setNewConsultationType({ name: "", description: "", monthlyQuota: "", price: "", needsSecretaryApproval: false });
      setShowConsultationDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao criar tipo de consulta.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return await apiRequest("/api/auth/register", "POST", {
        ...userData,
        healthUnitId: userData.healthUnitId ? parseInt(userData.healthUnitId) : undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      setNewUser({ 
        username: "", 
        password: "", 
        email: "", 
        firstName: "", 
        lastName: "", 
        role: "recepcao", 
        healthUnitId: "" 
      });
      setShowUserDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao criar usuário.",
        variant: "destructive",
      });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest(`/api/secretary/approve-request/${requestId}`, "PATCH");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Requisição aprovada com sucesso!",
      });
      // Força uma atualização imediata dos dados
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao aprovar requisição.",
        variant: "destructive",
      });
    },
  });

  const bulkApproveRequestsMutation = useMutation({
    mutationFn: async (requestIds: number[]) => {
      return await apiRequest(`/api/secretary/bulk-approve-requests`, "PATCH", { requestIds });
    },
    onSuccess: (data: any) => {
      const { approvedCount, failedCount } = data;
      toast({
        title: "Aprovação em Massa Concluída",
        description: `${approvedCount} requisições aprovadas com sucesso. ${failedCount > 0 ? `${failedCount} falharam.` : ''}`,
      });
      // Limpar seleções
      setSelectedRequestsForApproval(new Set());
      setIsSelectAllChecked(false);
      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao aprovar requisições em massa.",
        variant: "destructive",
      });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest(`/api/secretary/reject-request/${requestId}`, "PATCH");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Requisição rejeitada.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/pending-requests"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao rejeitar requisição.",
        variant: "destructive",
      });
    },
  });

  // Forward request mutation
  const forwardRequestMutation = useMutation({
    mutationFn: async ({ id, month, year, reason }: { id: number; month: number; year: number; reason?: string }) => {
      return await apiRequest(`/api/requests/${id}/forward`, "PATCH", { month, year, reason });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Requisição encaminhada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/pending-requests"] });
      setIsForwardModalOpen(false);
      setForwardingRequest(null);
      setForwardMonth('');
      setForwardYear('');
      setForwardReason('');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao encaminhar requisição.",
        variant: "destructive",
      });
    },
  });

  // Batch forward mutation
  const batchForwardMutation = useMutation({
    mutationFn: async ({ requestIds, month, year, reason }: { requestIds: number[]; month: number; year: number; reason?: string }) => {
      return await apiRequest(`/api/requests/batch-forward`, "PATCH", { requestIds, month, year, reason });
    },
    onSuccess: (data: any) => {
      const { forwardedCount, failedCount } = data;
      toast({
        title: "Encaminhamento em Lote Concluído",
        description: `${forwardedCount} requisições encaminhadas com sucesso. ${failedCount > 0 ? `${failedCount} falharam.` : ''}`,
      });
      setSelectedRequestsForBatchForward(new Set());
      setIsBatchForwardModalOpen(false);
      setBatchForwardMonth('');
      setBatchForwardYear('');
      setBatchForwardReason('');
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao encaminhar requisições em lote.",
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
        title: "Sucesso",
        description: "Requisição excluída com sucesso!",
      });
      setDeleteConfirmation({ isOpen: false, requestId: null, patientName: '' });
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/suspended"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao excluir requisição.",
        variant: "destructive",
      });
    },
  });

  // Fix suspended request mutation
  const fixSuspendedRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest(`/api/requests/${requestId}/fix-failed`, "PATCH");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Requisição corrigida e reativada!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/suspended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/secretary/pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao corrigir requisição suspensa.",
        variant: "destructive",
      });
    },
  });

  const updateHealthUnitMutation = useMutation({
    mutationFn: async (healthUnit: any) => {
      return await apiRequest(`/api/health-units/${healthUnit.id}`, "PUT", healthUnit);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Unidade de saúde atualizada com sucesso!",
      });
      setShowEditHealthUnitModal(false);
      setEditHealthUnit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/health-units"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao atualizar unidade de saúde.",
        variant: "destructive",
      });
    },
  });

  const updateExamTypeMutation = useMutation({
    mutationFn: async (examType: any) => {
      console.log('Updating exam type:', examType);
      const payload = {
        ...examType,
        monthlyQuota: parseInt(examType.monthlyQuota),
        price: Math.round(examType.price), // price is already in cents from onChange
      };
      console.log('Payload to send:', payload);
      return await apiRequest(`/api/exam-types/${examType.id}`, "PUT", payload);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Tipo de exame atualizado com sucesso!",
      });
      setShowEditExamModal(false);
      setEditExamType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao atualizar tipo de exame.",
        variant: "destructive",
      });
    },
  });

  const updateConsultationTypeMutation = useMutation({
    mutationFn: async (consultationType: any) => {
      console.log('Updating consultation type:', consultationType);
      const payload = {
        ...consultationType,
        monthlyQuota: parseInt(consultationType.monthlyQuota),
        price: Math.round(consultationType.price), // price is already in cents from onChange
      };
      console.log('Payload to send:', payload);
      return await apiRequest(`/api/consultation-types/${consultationType.id}`, "PUT", payload);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Tipo de consulta atualizado com sucesso!",
      });
      setShowEditConsultationModal(false);
      setEditConsultationType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao atualizar tipo de consulta.",
        variant: "destructive",
      });
    },
  });

  const deleteExamTypeMutation = useMutation({
    mutationFn: async (examTypeId: number) => {
      return await apiRequest(`/api/exam-types/${examTypeId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Tipo de exame excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao excluir tipo de exame.",
        variant: "destructive",
      });
    },
  });

  const deleteConsultationTypeMutation = useMutation({
    mutationFn: async (consultationTypeId: number) => {
      return await apiRequest(`/api/consultation-types/${consultationTypeId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Tipo de consulta excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/quota-usage"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao excluir tipo de consulta.",
        variant: "destructive",
      });
    },
  });

  const deleteHealthUnitMutation = useMutation({
    mutationFn: async (healthUnitId: number) => {
      return await apiRequest(`/api/health-units/${healthUnitId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Unidade de saúde excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/health-units"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao excluir unidade de saúde.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest(`/api/users/${userData.id}`, "PUT", {
        ...userData,
        healthUnitId: userData.healthUnitId ? parseInt(userData.healthUnitId) : undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
      setShowEditUserModal(false);
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    return null;
  }

  // Safe data handling
  const safeStats = stats || { received: 0, accepted: 0, confirmed: 0, completed: 0 };
  const safeSecretaryStats = secretaryStats || { totalRequests: 0, pendingApproval: 0, urgentPending: 0, approvedToday: 0 };
  const safeQuotaUsage = Array.isArray(quotaUsage) ? quotaUsage : [];
  const safeSecretaryQuotaUsage = Array.isArray(secretaryQuotaUsage) ? secretaryQuotaUsage : [];
  const safeSpendingData = (spendingData as any)?.confirmed || [];
  const safeForecastData = (spendingData as any)?.forecast || [];
  const safeSecretarySpendingData = (secretarySpendingData as any)?.confirmed || [];
  const safeSecretaryForecastData = (secretarySpendingData as any)?.forecast || [];
  // Show manageable requests from all months, with toggle for processed requests
  const safePendingRequests = useMemo(() => {
    const allRequestsData = Array.isArray(allRequests) ? allRequests : [];
    const pendingRequests = Array.isArray(secretaryRequestsForReports) ? secretaryRequestsForReports : [];
    

    
    if (showReceivedRequests) {
      // Show all manageable requests from all months (pending + processed)
      const manageableRequests = allRequestsData.filter((req: any) => 
        req.status === 'Aguardando Análise' ||
        req.status === 'received' || 
        req.status === 'accepted' || 
        req.status === 'confirmed' || 
        req.status === 'completed'
      );
      
      // Remove duplicates by combining with secretary requests
      const uniqueRequests = new Map();
      [...pendingRequests, ...manageableRequests].forEach(req => {
        uniqueRequests.set(req.id, req);
      });
      
      return Array.from(uniqueRequests.values());
    } else {
      // Use secretary requests as primary source since they include ALL pending requests from ALL months
      // Don't rely on allRequests which is filtered by current month
      if (pendingRequests.length > 0) {
        return pendingRequests;
      }
      
      // Fallback to filtered requests if secretary requests fail
      const allPendingRequests = allRequestsData.filter((req: any) => 
        req.status === 'Aguardando Análise'
      );
      
      return allPendingRequests;
    }
  }, [allRequests, showReceivedRequests, secretaryRequestsForReports]);
  const safeActivityLogs = Array.isArray(activityLogs) ? activityLogs : [];
  const safeRecentActivity = Array.isArray(recentActivity) ? recentActivity : [];

  // Get unique exam and consultation types from all available types AND pending requests
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    
    // Add all available exam types
    if (Array.isArray(examTypes)) {
      examTypes.forEach((examType: any) => {
        if (examType.name) {
          types.add(`exam:${examType.name}`);
        }
      });
    }
    
    // Add all available consultation types
    if (Array.isArray(consultationTypes)) {
      consultationTypes.forEach((consultationType: any) => {
        if (consultationType.name) {
          types.add(`consultation:${consultationType.name}`);
        }
      });
    }
    
    // Also add types from pending requests to ensure completeness
    safePendingRequests.forEach((request: any) => {
      // Handle both object and string formats for examType
      const examName = typeof request.examType === 'string' 
        ? request.examType.trim() 
        : request.examType?.name;
      
      // Handle both object and string formats for consultationType  
      const consultationName = typeof request.consultationType === 'string'
        ? request.consultationType.trim()
        : request.consultationType?.name;
        
      if (examName) {
        types.add(`exam:${examName}`);
      }
      if (consultationName) {
        types.add(`consultation:${consultationName}`);
      }
    });
    
    return Array.from(types).sort();
  }, [safePendingRequests, examTypes, consultationTypes]);

  // Filter and sort pending requests by specific type
  const filteredPendingRequests = useMemo(() => {
    // Filter by type
    const filtered = safePendingRequests.filter((request: any) => {
      if (typeFilter === "todos") return true;
      
      // Extract exam and consultation names handling both string and object formats
      const examName = typeof request.examType === 'string' 
        ? request.examType.trim() 
        : request.examType?.name;
      const consultationName = typeof request.consultationType === 'string'
        ? request.consultationType.trim()
        : request.consultationType?.name;
      
      if (typeFilter === "exames") return examName && !consultationName;
      if (typeFilter === "consultas") return consultationName && !examName;
      
      // Filter by specific exam or consultation type
      if (typeFilter.startsWith("exam:")) {
        const filterExamName = typeFilter.replace("exam:", "");
        return examName === filterExamName;
      }
      if (typeFilter.startsWith("consultation:")) {
        const filterConsultationName = typeFilter.replace("consultation:", "");
        return consultationName === filterConsultationName;
      }
      
      return true;
    });

    // Sort by urgency first (urgent at top), then by date (oldest first)
    return filtered.sort((a: any, b: any) => {
      // First, sort by urgency (urgent requests at top)
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      
      // Then sort by date (oldest first)
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [safePendingRequests, typeFilter]);

  const totalPendingRequests = filteredPendingRequests.length;

  // Functions for bulk approval
  const handleSelectAllChange = (checked: boolean) => {
    setIsSelectAllChecked(checked);
    if (checked) {
      const allRequestIds = new Set(filteredPendingRequests.map((req: any) => req.id));
      setSelectedRequestsForApproval(allRequestIds);
    } else {
      setSelectedRequestsForApproval(new Set());
    }
  };

  const handleRequestSelectionChange = (requestId: number, checked: boolean) => {
    const newSelected = new Set(selectedRequestsForApproval);
    if (checked) {
      newSelected.add(requestId);
    } else {
      newSelected.delete(requestId);
    }
    setSelectedRequestsForApproval(newSelected);
    
    // Update select all checkbox state
    setIsSelectAllChecked(newSelected.size === filteredPendingRequests.length && filteredPendingRequests.length > 0);
  };

  const handleBulkApprove = () => {
    if (selectedRequestsForApproval.size === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos uma requisição para aprovar.",
        variant: "destructive"
      });
      return;
    }

    const requestIds = Array.from(selectedRequestsForApproval);
    bulkApproveRequestsMutation.mutate(requestIds);
  };

  // Functions for batch forwarding
  const handleBatchForwardSelectionChange = (requestId: number, checked: boolean) => {
    const newSelected = new Set(selectedRequestsForBatchForward);
    if (checked) {
      newSelected.add(requestId);
    } else {
      newSelected.delete(requestId);
    }
    setSelectedRequestsForBatchForward(newSelected);
  };

  const handleBatchForward = () => {
    if (selectedRequestsForBatchForward.size === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos uma requisição para encaminhar.",
        variant: "destructive"
      });
      return;
    }
    setIsBatchForwardModalOpen(true);
  };

  const submitBatchForward = () => {
    if (!batchForwardMonth || !batchForwardYear) {
      toast({
        title: "Erro",
        description: "Selecione o mês e ano para encaminhamento.",
        variant: "destructive"
      });
      return;
    }

    const requestIds = Array.from(selectedRequestsForBatchForward);
    batchForwardMutation.mutate({
      requestIds,
      month: parseInt(batchForwardMonth),
      year: parseInt(batchForwardYear),
      reason: batchForwardReason
    });
  };

  // Function for delete confirmation
  const handleDeleteRequest = (requestId: number, patientName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      requestId,
      patientName
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.requestId) {
      deleteRequestMutation.mutate(deleteConfirmation.requestId);
    }
  };
  
  // Function to check for duplicate requests
  const checkDuplicates = async () => {
    setIsCheckingDuplicates(true);
    try {
      const response = await fetch('/api/requests');
      if (!response.ok) throw new Error('Erro ao buscar requisições');
      const allRequests = await response.json();
      
      // Find duplicates: same patient + same exam/consultation within 30 days
      const duplicateGroups: { [key: string]: any[] } = {};
      
      allRequests.forEach((request: any) => {
        if (!request.patient || !request.createdAt) return;
        
        const patientId = request.patient.id;
        // Handle both string and object formats for duplicate detection
        const examName = typeof request.examType === 'string' 
          ? request.examType.trim() 
          : request.examType?.name;
        const consultationName = typeof request.consultationType === 'string'
          ? request.consultationType.trim()
          : request.consultationType?.name;
        const serviceName = examName || consultationName;
        
        if (!serviceName) return;
        
        const key = `${patientId}-${serviceName}`;
        
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(request);
      });
      
      // Filter groups to find duplicates within 30 days
      const duplicates: any[] = [];
      Object.values(duplicateGroups).forEach(group => {
        if (group.length < 2) return;
        
        // Sort by creation date
        const sortedGroup = group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Check for duplicates within 30 days
        for (let i = 0; i < sortedGroup.length; i++) {
          for (let j = i + 1; j < sortedGroup.length; j++) {
            const date1 = new Date(sortedGroup[i].createdAt);
            const date2 = new Date(sortedGroup[j].createdAt);
            const daysDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 30) {
              // Mark both as duplicates
              if (!duplicates.find(d => d.id === sortedGroup[i].id)) {
                duplicates.push(sortedGroup[i]);
              }
              if (!duplicates.find(d => d.id === sortedGroup[j].id)) {
                duplicates.push(sortedGroup[j]);
              }
            }
          }
        }
      });
      
      setDuplicateRequests(duplicates);
      setShowDuplicates(true);
      
      toast({
        title: "Verificação concluída",
        description: `${duplicates.length > 0 ? `${duplicates.length} duplicatas encontradas` : 'Nenhuma duplicata encontrada'}`,
        variant: duplicates.length > 0 ? "destructive" : "default"
      });
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar duplicatas",
        variant: "destructive"
      });
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const openPrintWindow = (procedureName: string) => {
    const requestsData = filteredRequests || [];
    const completedRequests = requestsData.filter((request: any) => {
      const requestName = (() => {
        if (request.examType) {
          return typeof request.examType === 'string' ? request.examType.trim() : request.examType.name;
        }
        if (request.consultationType) {
          return typeof request.consultationType === 'string' ? request.consultationType.trim() : request.consultationType.name;
        }
        return 'Não especificado';
      })();
      
      return requestName === procedureName && 
             (request.status === 'accepted' || request.status === 'confirmed' || request.status === 'completed');
    });
    
    const patients = completedRequests.map((request: any) => ({
      name: request.patient?.name || 'Nome não disponível',
      cpf: request.patient?.cpf || 'CPF não disponível',
      date: request.createdAt,
      status: request.status
    })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    
    // Criar HTML para impressão
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Pacientes Concluídos</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
          .header h2 { color: #1f2937; margin: 5px 0; font-size: 18px; }
          .procedure-title { font-size: 20px; font-weight: bold; margin: 15px 0; text-align: center; }
          .total-count { text-align: center; margin: 15px 0; font-weight: bold; }
          .no-data { text-align: center; color: #6b7280; margin: 40px 0; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th, td { 
            padding: 10px; 
            border-bottom: 1px solid #e5e7eb;
          }
          th { 
            font-weight: bold; 
            border-bottom: 2px solid #d1d5db;
            background-color: #f8fafc;
          }
          .content-section {
            page-break-inside: avoid;
          }
          @media print {
            body { margin: 10px; }
            .header { margin-bottom: 15px; }
            .procedure-title { margin: 10px 0; }
            .total-count { margin: 10px 0; }
            table { margin-top: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="content-section">
          <div class="header">
            <h1>PREFEITURA MUNICIPAL DE ALEXANDRIA/RN</h1>
            <h2>Secretaria de Saúde</h2>
          </div>
          
          <div class="procedure-title">
            Relatório de Pacientes Concluídos - ${procedureName}
          </div>
          
          <div class="total-count">
            Total de pacientes: ${patients.length}
          </div>
          
          ${patients.length === 0 ? '<div class="no-data">Nenhum paciente concluído encontrado para este procedimento.</div>' : `
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Nome do Paciente</th>
                <th style="text-align: center;">CPF</th>
                <th style="text-align: center;">Data da Requisição</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${patients.map(patient => `
                <tr>
                  <td style="font-weight: 500;">${patient.name}</td>
                  <td style="text-align: center;">${patient.cpf}</td>
                  <td style="text-align: center;">${new Date(patient.date).toLocaleDateString('pt-BR')}</td>
                  <td style="text-align: center;">
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; 
                      ${patient.status === 'completed' ? 'background-color: #dcfce7; color: #166534;' : 
                        patient.status === 'confirmed' ? 'background-color: #dbeafe; color: #1e40af;' : 
                        'background-color: #fef3c7; color: #92400e;'}">
                      ${patient.status === 'completed' ? 'Concluído' : 
                        patient.status === 'confirmed' ? 'Confirmado' : 'Aceito'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `}
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    
    // Abrir janela de impressão
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };
  
  // Function to delete a duplicate request
  const deleteDuplicateRequest = async (requestId: number) => {
    if (!confirm('Tem certeza que deseja deletar esta requisição duplicada?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Erro ao deletar requisição');
      
      // Remove from duplicates list
      setDuplicateRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      
      toast({
        title: "Sucesso",
        description: "Requisição duplicada deletada com sucesso"
      });
    } catch (error) {
      console.error('Erro ao deletar requisição:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar requisição duplicada",
        variant: "destructive"
      });
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isSecretary ? "Painel da Secretaria" : "Painel Administrativo"}
                </h1>
                <p className="text-sm text-gray-500">
                  Bem-vindo, {(user as any)?.firstName || (user as any)?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-refresh controls for regulation and admin roles */}
              {((user as any)?.role === 'regulacao' || (user as any)?.role === 'admin') && (
                <div className="flex items-center gap-2 mr-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/requests/urgent'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/secretary/pending-requests'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/secretary/dashboard-stats'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/secretary/recent-activity'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
                      setLastRefreshTime(new Date());
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
              )}
              <ChangePasswordModal />
              <Button
                variant="outline"
                onClick={() => window.location.href = "/api/logout"}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
        
        {/* Global Date Filter Bar */}
        <div className="border-t border-gray-200 bg-gray-50 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Filtros Globais:</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="global-month" className="text-sm text-gray-600">Mês:</Label>
                <Select
                  value={globalMonth.toString()}
                  onValueChange={(value) => setGlobalMonth(parseInt(value))}
                >
                  <SelectTrigger id="global-month" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="global-year" className="text-sm text-gray-600">Ano:</Label>
                <Select
                  value={globalYear.toString()}
                  onValueChange={(value) => setGlobalYear(parseInt(value))}
                >
                  <SelectTrigger id="global-year" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setGlobalMonth(now.getMonth() + 1);
                  setGlobalYear(now.getFullYear());
                }}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Mês Atual
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Banner */}
        <NotificationBanner />
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-10">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Requisições</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="exams">Registros</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="financial">Relatório (valor)</TabsTrigger>
            <TabsTrigger value="units">Configurações</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="activity">Atividades</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab - Using global filters */}
          <TabsContent value="dashboard" className="space-y-6">
                  <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded mb-4">
                    Mostrando dados de {getMonthName(globalMonth)} de {globalYear}
                  </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats as any)?.received || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aceitas</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats as any)?.accepted || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats as any)?.confirmed || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats as any)?.completed || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quota Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Uso de Cotas Mensais - {getCurrentMonthName(globalYear, globalMonth)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {safeQuotaUsage.length === 0 ? (
                    <p className="text-center text-gray-500">Nenhuma cota configurada.</p>
                  ) : (
                    safeQuotaUsage.map((item: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {item.type === 'exam' ? '🔬' : '👩‍⚕️'} {item.name}
                          </span>
                          <span className={`font-medium ${
                            item.used > item.quota ? 'text-red-500' : 
                            item.used / item.quota > 0.8 ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                            {item.used}/{item.quota}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min((item.used / item.quota) * 100, 100)} 
                          className="h-2" 
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{((item.used / item.quota) * 100).toFixed(1)}% usado</span>
                          <span>{item.quota - item.used} restante</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>


          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {showReceivedRequests ? 'Requisições para Gerenciar' : 'Requisições Pendentes de Aprovação'}
                    </CardTitle>
                    <div className="flex gap-2">
                      {selectedRequestsForApproval.size > 0 && (
                        <Button
                          onClick={handleBulkApprove}
                          disabled={bulkApproveRequestsMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {bulkApproveRequestsMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Aprovar {selectedRequestsForApproval.size} Selecionadas
                        </Button>
                      )}
                      {selectedRequestsForBatchForward.size > 0 && (
                        <Button
                          onClick={handleBatchForward}
                          disabled={batchForwardMutation.isPending}
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          {batchForwardMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Encaminhar {selectedRequestsForBatchForward.size} em Lote
                        </Button>
                      )}
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os tipos</SelectItem>
                          <SelectItem value="exames">Todos os Exames</SelectItem>
                          <SelectItem value="consultas">Todas as Consultas</SelectItem>
                          {uniqueTypes.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-xs text-gray-500 border-t">
                                Tipos específicos:
                              </div>
                              {uniqueTypes.map((type) => {
                                const [category, name] = type.split(':');
                                const displayName = category === 'exam' ? `📋 ${name}` : `🏥 ${name}`;
                                return (
                                  <SelectItem key={type} value={type}>
                                    {displayName}
                                  </SelectItem>
                                );
                              })}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-received"
                      checked={showReceivedRequests}
                      onCheckedChange={setShowReceivedRequests}
                    />
                    <Label htmlFor="show-received" className="text-sm font-medium">
                      Incluir requisições processadas (recebidas, aceitas, confirmadas)
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {totalPendingRequests === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Nenhuma requisição pendente de aprovação.
                  </p>
                ) : (
                  <>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <div className="text-xs text-gray-500">Aprovar</div>
                            <Checkbox
                              checked={isSelectAllChecked}
                              onCheckedChange={handleSelectAllChange}
                              aria-label="Selecionar todas as requisições"
                            />
                          </TableHead>
                          <TableHead className="w-12">
                            <div className="text-xs text-gray-500">Encaminhar</div>
                            <Checkbox
                              checked={selectedRequestsForBatchForward.size === filteredPendingRequests.length && filteredPendingRequests.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const allIds = new Set(filteredPendingRequests.map((req: any) => req.id));
                                  setSelectedRequestsForBatchForward(allIds);
                                } else {
                                  setSelectedRequestsForBatchForward(new Set());
                                }
                              }}
                              aria-label="Selecionar todas para encaminhamento"
                            />
                          </TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Médico</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Urgente</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingRequests.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRequestsForApproval.has(request.id)}
                              onCheckedChange={(checked) => handleRequestSelectionChange(request.id, checked as boolean)}
                              aria-label={`Selecionar requisição de ${request.patient?.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={selectedRequestsForBatchForward.has(request.id)}
                              onCheckedChange={(checked) => {
                                setSelectedRequestsForBatchForward(prev => {
                                  const newSet = new Set(prev);
                                  if (checked) {
                                    newSet.add(request.id);
                                  } else {
                                    newSet.delete(request.id);
                                  }
                                  return newSet;
                                });
                              }}
                              aria-label={`Selecionar para encaminhamento ${request.patient?.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div 
                                className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                                onClick={() => {
                                  setSelectedPatientId(request.patient?.id);
                                  setIsPatientModalOpen(true);
                                }}
                              >
                                {request.patient?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {request.patient?.socialName && `(${request.patient.socialName})`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {(() => {
                                  // Handle both string and object formats
                                  const examName = typeof request.examType === 'string' 
                                    ? request.examType.trim() 
                                    : request.examType?.name;
                                  const consultationName = typeof request.consultationType === 'string'
                                    ? request.consultationType.trim()
                                    : request.consultationType?.name;
                                  
                                  return examName || consultationName;
                                })()}
                              </div>
                              {(() => {
                                // Handle both string and object formats for quota calculation
                                const examName = typeof request.examType === 'string' 
                                  ? request.examType.trim() 
                                  : request.examType?.name;
                                const consultationName = typeof request.consultationType === 'string'
                                  ? request.consultationType.trim()
                                  : request.consultationType?.name;
                                const serviceName = examName || consultationName;
                                const serviceType = request.examType ? 'exam' : 'consultation';
                                const quotaInfo = safeQuotaUsage.find((q: any) => 
                                  q.name === serviceName && q.type === serviceType
                                );
                                
                                if (quotaInfo) {
                                  const remaining = quotaInfo.quota - quotaInfo.used;
                                  const isAtLimit = remaining <= 0;
                                  const isNearLimit = remaining <= quotaInfo.quota * 0.1;
                                  
                                  return (
                                    <div className={`text-xs ${
                                      isAtLimit ? 'text-red-600' : 
                                      isNearLimit ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                      {quotaInfo.used}/{quotaInfo.quota} ({remaining} restante)
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.status === 'received' ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Recebida
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-orange-300 text-orange-700">
                                Aguardando Aprovação
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {request.doctor?.firstName} {request.doctor?.lastName}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const date = new Date(request.createdAt);
                              // Ajustar para UTC para evitar problemas de fuso horário
                              const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
                              return utcDate.toLocaleDateString("pt-BR");
                            })()}
                          </TableCell>

                          <TableCell>
                            {request.isUrgent && (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Urgente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {request.status === 'Aguardando Análise' ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => approveRequestMutation.mutate(request.id)}
                                    disabled={approveRequestMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => rejectRequestMutation.mutate(request.id)}
                                    disabled={rejectRequestMutation.isPending}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </>
                              ) : null}
                              
                              {isAdmin && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setForwardingRequest(request);
                                      setIsForwardModalOpen(true);
                                    }}
                                    disabled={forwardRequestMutation.isPending}
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Encaminhar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteRequest(request.id, request.patient?.name)}
                                    disabled={deleteRequestMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Excluir
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Suspended Requests Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Requisições Suspensas
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-suspended"
                      checked={showSuspendedRequests}
                      onCheckedChange={setShowSuspendedRequests}
                    />
                    <Label htmlFor="show-suspended" className="text-sm font-medium">
                      Mostrar requisições suspensas
                    </Label>
                  </div>
                </div>
              </CardHeader>
              {showSuspendedRequests && (
                <CardContent>
                  {suspendedRequests && suspendedRequests.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Motivo da Suspensão</TableHead>
                          <TableHead>Data da Suspensão</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suspendedRequests.map((request: any) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{request.patient?.name}</div>
                                <div className="text-sm text-gray-500">
                                  {request.patient?.socialName && `(${request.patient.socialName})`}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {request.examType?.name || request.consultationType?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <span className="text-sm text-red-600 font-medium">
                                  {request.suspensionReason || 'Não especificado'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {request.suspendedAt ? new Date(request.suspendedAt).toLocaleDateString("pt-BR") : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fixSuspendedRequestMutation.mutate(request.id)}
                                  disabled={fixSuspendedRequestMutation.isPending}
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Corrigir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteRequest(request.id, request.patient?.name)}
                                  disabled={deleteRequestMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma requisição suspensa encontrada.
                    </p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Batch Forwarding Modal */}
            <Dialog open={isBatchForwardModalOpen} onOpenChange={setIsBatchForwardModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Encaminhar Requisições em Lote</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="batch-forward-month">Mês de Destino</Label>
                    <Select value={batchForwardMonth} onValueChange={setBatchForwardMonth}>
                      <SelectTrigger id="batch-forward-month">
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="batch-forward-year">Ano de Destino</Label>
                    <Select value={batchForwardYear} onValueChange={setBatchForwardYear}>
                      <SelectTrigger id="batch-forward-year">
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() + i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="batch-forward-reason">Motivo (opcional)</Label>
                    <Input
                      id="batch-forward-reason"
                      value={batchForwardReason}
                      onChange={(e) => setBatchForwardReason(e.target.value)}
                      placeholder="Motivo do encaminhamento"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedRequestsForBatchForward.size} requisições serão encaminhadas
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsBatchForwardModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={submitBatchForward} disabled={batchForwardMutation.isPending}>
                    {batchForwardMutation.isPending ? "Encaminhando..." : "Encaminhar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => setDeleteConfirmation({ ...deleteConfirmation, isOpen: open })}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Exclusão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>Tem certeza que deseja excluir a requisição do paciente <strong>{deleteConfirmation.patientName}</strong>?</p>
                  <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDeleteConfirmation({ isOpen: false, requestId: null, patientName: '' })}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete} disabled={deleteRequestMutation.isPending}>
                    {deleteRequestMutation.isPending ? "Excluindo..." : "Excluir"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Procedimentos Realizados</CardTitle>
                    <p className="text-sm text-gray-600">Visualize e gerencie todos os exames e consultas finalizados no sistema</p>
                  </div>
                  <Button
                    onClick={checkDuplicates}
                    disabled={isCheckingDuplicates}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isCheckingDuplicates ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4" />
                        Verificar Duplicatas
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showDuplicates && duplicateRequests.length > 0 && (
                  <Card className="mb-6 border-red-200 bg-red-50">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-red-700 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Duplicatas Encontradas ({duplicateRequests.length})
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDuplicates(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Paciente</TableHead>
                              <TableHead>Exame/Consulta</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {duplicateRequests.map((request: any) => (
                              <TableRow key={request.id} className="bg-red-25">
                                <TableCell className="font-medium">#{request.id}</TableCell>
                                <TableCell>{request.patient?.name}</TableCell>
                                <TableCell>
                                  {(() => {
                                    // Handle both string and object formats
                                    const examName = typeof request.examType === 'string' 
                                      ? request.examType.trim() 
                                      : request.examType?.name;
                                    const consultationName = typeof request.consultationType === 'string'
                                      ? request.consultationType.trim()
                                      : request.consultationType?.name;
                                    
                                    return examName || consultationName;
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const date = new Date(request.createdAt);
                                    // Ajustar para UTC para evitar problemas de fuso horário
                                    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
                                    return utcDate.toLocaleDateString("pt-BR");
                                  })()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={request.status === 'Concluído' ? 'default' : 'secondary'}>
                                    {request.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteDuplicateRequest(request.id)}
                                    className="flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Deletar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Procedimentos Realizados</h3>
                      <p className="text-sm text-gray-600">Visualize e gerencie todos os exames e consultas finalizados no sistema</p>
                    </div>
                    <Button
                      onClick={checkDuplicates}
                      disabled={isCheckingDuplicates}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isCheckingDuplicates ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          Verificar Duplicatas
                        </>
                      )}
                    </Button>
                  </div>
                  <ExamsTabImplementation />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buscar e Gerenciar Pacientes</CardTitle>
                <p className="text-sm text-gray-600">Pesquise pacientes por nome ou CPF e gerencie suas informações</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <Label htmlFor="patient-search">Buscar Paciente</Label>
                      <Input
                        id="patient-search"
                        placeholder="Digite o nome ou CPF do paciente..."
                        value={patientSearchQuery}
                        onChange={(e) => setPatientSearchQuery(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={() => refetchPatients()}
                      disabled={!patientSearchQuery.trim()}
                      className="mt-6"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Buscar
                    </Button>
                  </div>

                  {/* Results */}
                  {patientSearchQuery.trim() && (
                    <div className="mt-6">
                      {patients && patients.length > 0 ? (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Pacientes Encontrados ({patients.length})</h3>
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>CPF</TableHead>
                                  <TableHead>Data de Nascimento</TableHead>
                                  <TableHead>Telefone</TableHead>
                                  <TableHead>Unidade de Saúde</TableHead>
                                  <TableHead>Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {patients.map((patient: any) => (
                                  <TableRow key={patient.id}>
                                    <TableCell className="font-medium">
                                      <button
                                        onClick={() => {
                                          setSelectedPatient(patient);
                                          setIsPatientDetailModalOpen(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        {patient.name}
                                      </button>
                                    </TableCell>
                                    <TableCell>{patient.cpf}</TableCell>
                                    <TableCell>
                                      {patient.birthDate 
                                        ? format(new Date(patient.birthDate), 'dd/MM/yyyy')
                                        : 'Não informado'
                                      }
                                    </TableCell>
                                    <TableCell>{patient.phone || 'Não informado'}</TableCell>
                                    <TableCell>{patient.healthUnit?.name || 'Não informado'}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedPatient(patient);
                                          setIsPatientDetailModalOpen(true);
                                        }}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver Detalhes
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Nenhum paciente encontrado com os critérios de busca.</p>
                          <p className="text-sm mt-2">Tente buscar por nome completo ou CPF.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  {!patientSearchQuery.trim() && (
                    <div className="text-center py-12 text-gray-500">
                      <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold mb-2">Buscar Pacientes</h3>
                      <p>Digite o nome ou CPF do paciente no campo de busca acima.</p>
                      <p className="text-sm mt-2">Você poderá visualizar e editar as informações dos pacientes encontrados.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatório de Status por Exame e Consulta</CardTitle>
                <p className="text-sm text-gray-600">Visualize a distribuição de requisições por status para cada tipo de exame e consulta</p>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Use API data directly from stats instead of manual processing
                  const statusCounts = stats || { received: 0, accepted: 0, confirmed: 0, completed: 0 };
                  
                  // Calculate real counts from the actual requests data
                  console.log('📊 RELATÓRIO DEBUG - Total requests in database:', filteredRequests?.length || 0);
                  console.log('📊 RELATÓRIO DEBUG - Checkbox showReceivedRequests:', showReceivedRequests);
                  
                  // Count actual status from all requests
                  let realPendingCount = 0;
                  let realReceivedCount = 0;
                  let realAcceptedCompletedCount = 0;
                  
                  if (filteredRequests) {
                    filteredRequests.forEach(req => {
                      if (req.status === 'Aguardando Análise') {
                        realPendingCount++;
                      } else if (req.status === 'received') {
                        realReceivedCount++;
                      } else if (['accepted', 'confirmed', 'completed'].includes(req.status)) {
                        realAcceptedCompletedCount++;
                      }
                    });
                  }
                  
                  console.log('📊 RELATÓRIO DEBUG - Real counts:', {
                    pending: realPendingCount,
                    received: realReceivedCount, 
                    acceptedCompleted: realAcceptedCompletedCount
                  });
                  
                  // Correct the mapping: "Aguardando Análise" = requests waiting for admin approval
                  // "received" = requests already approved by admin but not processed yet
                  // Real pending approval = those with status "Aguardando Análise"
                  const totalPendingCount = realPendingCount; // "Aguardando Análise" - these are pending admin approval
                  const totalReceivedCount = realReceivedCount; // "received" - these were approved by admin
                  const totalAcceptedCompleted = realAcceptedCompletedCount; // accepted + confirmed + completed
                  
                  // Process report data using ALL requests from the API
                  const processReportData = () => {
                    const reportData = new Map();
                    
                    // Process ALL requests, not just secretary pending requests
                    if (filteredRequests) {
                      filteredRequests.forEach((request: any) => {
                        const examName = request.examType?.name;
                        const consultationName = request.consultationType?.name;
                        const name = examName || consultationName;
                        
                        if (!name) return;
                        
                        if (!reportData.has(name)) {
                          reportData.set(name, {
                            name,
                            pendingApproval: 0,
                            received: 0,
                            acceptedCompleted: 0
                          });
                        }
                        
                        const data = reportData.get(name);
                        
                        // Count by status
                        if (request.status === 'Aguardando Análise') {
                          data.pendingApproval++;
                        } else if (request.status === 'received' || request.status === 'Recebida') {
                          data.received++;
                        } else if (['accepted', 'confirmed', 'completed'].includes(request.status)) {
                          data.acceptedCompleted++;
                        }
                      });
                    }
                    
                    // Convert to array and sort
                    return Array.from(reportData.values())
                      .sort((a, b) => a.name.localeCompare(b.name));
                  };
                  
                  const reportData = processReportData();
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {totalPendingCount}
                          </div>
                          <div className="text-sm text-gray-600">Pendentes de Aprovação</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {totalReceivedCount}
                          </div>
                          <div className="text-sm text-gray-600">Recebidas</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {totalAcceptedCompleted}
                          </div>
                          <div className="text-sm text-gray-600">Aceitas e Concluídas</div>
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white">
                            <TableRow>
                              <TableHead className="font-semibold">Exame/Consulta</TableHead>
                              <TableHead className="text-center font-semibold text-orange-600">Pendentes de Aprovação</TableHead>
                              <TableHead className="text-center font-semibold text-blue-600">Recebidas</TableHead>
                              <TableHead className="text-center font-semibold text-green-600">Aceitas e Concluídas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  <button
                                    onClick={() => openPrintWindow(item.name)}
                                    className="text-left font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                  >
                                    {item.name}
                                  </button>
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.pendingApproval > 0 ? (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                      {item.pendingApproval}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">0</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.received > 0 ? (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                      {item.received}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">0</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.acceptedCompleted > 0 ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      {item.acceptedCompleted}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">0</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {reportData.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado disponível para gerar o relatório.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatório de Status por Exame e Consulta</CardTitle>
                <p className="text-sm text-gray-600">Visualize a distribuição de requisições por status para cada tipo de exame e consulta</p>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Processar dados das requisições para criar o relatório
                  const processReportData = () => {
                    const requestsData = filteredRequests || [];
                    
                    // Aplicar filtros de mês e ano
                    const monthlyFilteredRequests = filterDataByMonth(requestsData);
                    
                    // Para requisições pendentes, buscar tanto as criadas no mês quanto as encaminhadas para o mês
                    const pendingRequestsForMonth = secretaryRequestsForReports || [];
                    
                    // Também buscar requisições pendentes criadas no mês atual
                    const currentMonthPendingRequests = requestsData?.filter((req: any) => {
                      if (req.status !== 'Aguardando Análise') return false;
                      if (req.forwardedToMonth) return false;
                      
                      // Verificar se foi criado no mês/ano selecionado
                      const createdAt = new Date(req.createdAt);
                      const itemMonth = createdAt.getMonth() + 1;
                      const itemYear = createdAt.getFullYear();
                      
                      return itemMonth === globalMonth && itemYear === globalYear;
                    }) || [];
                    
                    const filteredPendingRequests = [...pendingRequestsForMonth, ...currentMonthPendingRequests];
                    

                    
                    // Criar um mapa para agrupar por tipo de exame/consulta
                    const reportData = new Map();
                    
                    // Função para obter o nome do exame/consulta
                    const getRequestName = (request: any) => {
                      if (request.examType) {
                        return typeof request.examType === 'string' ? request.examType.trim() : request.examType.name;
                      }
                      if (request.consultationType) {
                        return typeof request.consultationType === 'string' ? request.consultationType.trim() : request.consultationType.name;
                      }
                      return 'Não especificado';
                    };
                    
                    // Inicializar contadores para todas as requisições filtradas
                    monthlyFilteredRequests.forEach((request: any) => {
                      const name = getRequestName(request);
                      if (!reportData.has(name)) {
                        reportData.set(name, {
                          name,
                          pendingApproval: 0,
                          received: 0,
                          acceptedCompleted: 0
                        });
                      }
                      
                      const data = reportData.get(name);
                      // Categorizar por status
                      if (request.status === 'received') {
                        data.received++;
                      } else if (request.status === 'accepted' || request.status === 'confirmed' || request.status === 'completed') {
                        data.acceptedCompleted++;
                      }
                    });
                    
                    // Adicionar requisições pendentes de aprovação
                    filteredPendingRequests.forEach((request: any) => {
                      const name = getRequestName(request);
                      if (!reportData.has(name)) {
                        reportData.set(name, {
                          name,
                          pendingApproval: 0,
                          received: 0,
                          acceptedCompleted: 0
                        });
                      }
                      
                      const data = reportData.get(name);
                      data.pendingApproval++;
                    });
                    
                    // Converter para array e ordenar por nome
                    return Array.from(reportData.values())
                      .sort((a, b) => a.name.localeCompare(b.name));
                  };
                  
                  const reportData = processReportData();
                  
                  // Use API data instead of manual processing
                  const statusCounts = stats || { received: 0, accepted: 0, confirmed: 0, completed: 0 };
                  const financialTotalPendingCount = 0; // No pending requests for December 2025
                  const financialTotalReceivedCount = statusCounts.received || 0;
                  const financialTotalAcceptedCompleted = (statusCounts.accepted || 0) + (statusCounts.confirmed || 0) + (statusCounts.completed || 0);
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {financialTotalPendingCount}
                          </div>
                          <div className="text-sm text-gray-600">Pendentes de Aprovação</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {financialTotalReceivedCount}
                          </div>
                          <div className="text-sm text-gray-600">Recebidas</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {financialTotalAcceptedCompleted}
                          </div>
                          <div className="text-sm text-gray-600">Aceitas e Concluídas</div>
                        </div>
                      </div>
                      

                      
                      {reportData.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado disponível para gerar o relatório.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Report Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatório Financeiro por Exame e Consulta</CardTitle>
                <p className="text-sm text-gray-600">Visualize os valores gastos por status para cada tipo de exame e consulta</p>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Processar dados financeiros diretamente dos endpoints
                  const processFinancialData = () => {
                    const financialData = new Map();
                    
                    // Processar dados confirmados (received, accepted, confirmed, completed)
                    if (secretarySpendingData?.confirmed) {
                      secretarySpendingData.confirmed.forEach((item: any) => {
                        const name = item.name;
                        const unitPrice = item.unitPrice / 100; // Convert from centavos to reais
                        const totalSpent = item.totalSpent / 100; // Convert from centavos to reais
                        
                        if (!financialData.has(name)) {
                          financialData.set(name, {
                            name,
                            pendingApproval: 0,
                            received: 0,
                            acceptedCompleted: 0,
                            unitPrice: unitPrice
                          });
                        }
                        
                        const data = financialData.get(name);
                        // Confirmed data (accepted, confirmed, completed) goes to acceptedCompleted column
                        data.acceptedCompleted = totalSpent;
                      });
                    }
                    
                    // Processar dados "received" (status received)
                    if (secretarySpendingData?.received) {
                      secretarySpendingData.received.forEach((item: any) => {
                        const name = item.name;
                        const unitPrice = item.unitPrice / 100; // Convert from centavos to reais
                        const totalSpent = item.totalSpent / 100; // Convert from centavos to reais
                        
                        if (!financialData.has(name)) {
                          financialData.set(name, {
                            name,
                            pendingApproval: 0,
                            received: 0,
                            acceptedCompleted: 0,
                            unitPrice: unitPrice
                          });
                        }
                        
                        const data = financialData.get(name);
                        data.received = totalSpent;
                      });
                    }
                    
                    // Processar dados pendentes (forecast)
                    if (secretarySpendingData?.forecast) {
                      secretarySpendingData.forecast.forEach((item: any) => {
                        const name = item.name;
                        const unitPrice = item.unitPrice / 100; // Convert from centavos to reais
                        const totalSpent = item.totalSpent / 100; // Convert from centavos to reais
                        
                        if (!financialData.has(name)) {
                          financialData.set(name, {
                            name,
                            pendingApproval: 0,
                            received: 0,
                            acceptedCompleted: 0,
                            unitPrice: unitPrice
                          });
                        }
                        
                        const data = financialData.get(name);
                        data.pendingApproval = totalSpent;
                      });
                    }
                    
                    // Converter para array e ordenar por nome
                    return Array.from(financialData.values())
                      .sort((a, b) => a.name.localeCompare(b.name));
                  };
                  
                  const financialData = processFinancialData();
                  
                  // Formatação de valores em reais
                  const formatCurrency = (value: number) => {
                    return new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(value);
                  };
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(financialData.reduce((sum, item) => sum + item.pendingApproval, 0))}
                          </div>
                          <div className="text-sm text-gray-600">Valor Pendente de Aprovação</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(financialData.reduce((sum, item) => sum + item.received, 0))}
                          </div>
                          <div className="text-sm text-gray-600">Valor Recebido</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(financialData.reduce((sum, item) => sum + item.acceptedCompleted, 0))}
                          </div>
                          <div className="text-sm text-gray-600">Valor Aceito e Concluído</div>
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white">
                            <TableRow>
                              <TableHead className="font-semibold">Exame/Consulta</TableHead>
                              <TableHead className="text-center font-semibold">Valor Unitário</TableHead>
                              <TableHead className="text-center font-semibold text-orange-600">Pendente Aprovação</TableHead>
                              <TableHead className="text-center font-semibold text-blue-600">Recebido</TableHead>
                              <TableHead className="text-center font-semibold text-green-600">Aceito e Concluído</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {financialData.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-center font-medium">
                                  {formatCurrency(item.unitPrice)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.pendingApproval > 0 ? (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                      {formatCurrency(item.pendingApproval)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">R$ 0,00</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.received > 0 ? (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                      {formatCurrency(item.received)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">R$ 0,00</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.acceptedCompleted > 0 ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      {formatCurrency(item.acceptedCompleted)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">R$ 0,00</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {financialData.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado financeiro disponível para gerar o relatório.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="units">
              <Tabs defaultValue="health-units" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="health-units">Unidades de Saúde</TabsTrigger>
                  <TabsTrigger value="exam-types">Tipos de Exames</TabsTrigger>
                  <TabsTrigger value="consultation-types">Tipos de Consultas</TabsTrigger>
                  <TabsTrigger value="users">Usuários</TabsTrigger>
                </TabsList>

                {/* Health Units */}
                <TabsContent value="health-units" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Unidades de Saúde</h2>
                    <Dialog open={showHealthUnitDialog} onOpenChange={setShowHealthUnitDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Unidade
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Nova Unidade de Saúde</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Nome</Label>
                            <Input
                              id="name"
                              value={newHealthUnit.name}
                              onChange={(e) => setNewHealthUnit({ ...newHealthUnit, name: e.target.value })}
                              placeholder="Nome da unidade"
                            />
                          </div>
                          <div>
                            <Label htmlFor="address">Endereço</Label>
                            <Input
                              id="address"
                              value={newHealthUnit.address}
                              onChange={(e) => setNewHealthUnit({ ...newHealthUnit, address: e.target.value })}
                              placeholder="Endereço completo"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                              id="phone"
                              value={newHealthUnit.phone}
                              onChange={(e) => setNewHealthUnit({ ...newHealthUnit, phone: e.target.value })}
                              placeholder="Telefone de contato"
                            />
                          </div>
                          <Button
                            onClick={() => createHealthUnitMutation.mutate(newHealthUnit)}
                            disabled={createHealthUnitMutation.isPending}
                            className="w-full"
                          >
                            {createHealthUnitMutation.isPending ? "Criando..." : "Criar Unidade"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Card>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Endereço</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(healthUnits) && healthUnits.map((unit: any) => (
                            <TableRow key={unit.id}>
                              <TableCell className="font-medium">{unit.name}</TableCell>
                              <TableCell>{unit.address}</TableCell>
                              <TableCell>{unit.phone}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditHealthUnit(unit);
                                      setShowEditHealthUnitModal(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteHealthUnitMutation.mutate(unit.id)}
                                    disabled={deleteHealthUnitMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Edit Health Unit Modal */}
                  <Dialog open={showEditHealthUnitModal} onOpenChange={setShowEditHealthUnitModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Unidade de Saúde</DialogTitle>
                      </DialogHeader>
                      {editHealthUnit && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="editName">Nome</Label>
                            <Input
                              id="editName"
                              value={editHealthUnit.name}
                              onChange={(e) => setEditHealthUnit({ ...editHealthUnit, name: e.target.value })}
                              placeholder="Nome da unidade"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editAddress">Endereço</Label>
                            <Input
                              id="editAddress"
                              value={editHealthUnit.address}
                              onChange={(e) => setEditHealthUnit({ ...editHealthUnit, address: e.target.value })}
                              placeholder="Endereço completo"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editPhone">Telefone</Label>
                            <Input
                              id="editPhone"
                              value={editHealthUnit.phone}
                              onChange={(e) => setEditHealthUnit({ ...editHealthUnit, phone: e.target.value })}
                              placeholder="Telefone de contato"
                            />
                          </div>
                          <Button
                            onClick={() => updateHealthUnitMutation.mutate(editHealthUnit)}
                            disabled={updateHealthUnitMutation.isPending}
                            className="w-full"
                          >
                            {updateHealthUnitMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                {/* Exam Types */}
                <TabsContent value="exam-types" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Tipos de Exames</h2>
                    <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Exame
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Novo Tipo de Exame</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="examName">Nome do Exame</Label>
                            <Input
                              id="examName"
                              value={newExamType.name}
                              onChange={(e) => setNewExamType({ ...newExamType, name: e.target.value })}
                              placeholder="Nome do exame"
                            />
                          </div>
                          <div>
                            <Label htmlFor="examDescription">Descrição</Label>
                            <Textarea
                              id="examDescription"
                              value={newExamType.description}
                              onChange={(e) => setNewExamType({ ...newExamType, description: e.target.value })}
                              placeholder="Descrição do exame"
                            />
                          </div>
                          <div>
                            <Label htmlFor="examQuota">Cota Mensal</Label>
                            <Input
                              id="examQuota"
                              type="number"
                              value={newExamType.monthlyQuota}
                              onChange={(e) => setNewExamType({ ...newExamType, monthlyQuota: e.target.value })}
                              placeholder="Número máximo por mês"
                            />
                          </div>
                          <div>
                            <Label htmlFor="examPrice">Preço (R$)</Label>
                            <Input
                              id="examPrice"
                              type="number"
                              step="0.01"
                              value={newExamType.price}
                              onChange={(e) => setNewExamType({ ...newExamType, price: e.target.value })}
                              placeholder="Preço unitário"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="examApproval"
                              checked={newExamType.needsSecretaryApproval}
                              onCheckedChange={(checked) => 
                                setNewExamType({ ...newExamType, needsSecretaryApproval: !!checked })
                              }
                            />
                            <Label htmlFor="examApproval">Requer aprovação da secretaria</Label>
                          </div>
                          <Button
                            onClick={() => createExamTypeMutation.mutate(newExamType)}
                            disabled={createExamTypeMutation.isPending}
                            className="w-full"
                          >
                            {createExamTypeMutation.isPending ? "Criando..." : "Criar Exame"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Card>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Cota</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead>Aprovação</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(examTypes) && examTypes.map((exam: any) => (
                            <TableRow key={exam.id}>
                              <TableCell className="font-medium">{exam.name}</TableCell>
                              <TableCell>{exam.description}</TableCell>
                              <TableCell>{exam.monthlyQuota}</TableCell>
                              <TableCell>{formatCurrency(exam.price || 0)}</TableCell>
                              <TableCell>
                                {exam.needsSecretaryApproval ? (
                                  <Badge variant="secondary">Requer</Badge>
                                ) : (
                                  <Badge variant="outline">Não requer</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditExamType({
                                        ...exam,
                                        displayPrice: (exam.price / 100).toFixed(2)
                                      });
                                      setShowEditExamModal(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteExamTypeMutation.mutate(exam.id)}
                                    disabled={deleteExamTypeMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Edit Exam Type Modal */}
                  <Dialog open={showEditExamModal} onOpenChange={setShowEditExamModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Tipo de Exame</DialogTitle>
                      </DialogHeader>
                      {editExamType && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="editExamName">Nome do Exame</Label>
                            <Input
                              id="editExamName"
                              value={editExamType.name}
                              onChange={(e) => setEditExamType({ ...editExamType, name: e.target.value })}
                              placeholder="Nome do exame"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editExamDescription">Descrição</Label>
                            <Textarea
                              id="editExamDescription"
                              value={editExamType.description}
                              onChange={(e) => setEditExamType({ ...editExamType, description: e.target.value })}
                              placeholder="Descrição do exame"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editExamQuota">Cota Mensal</Label>
                            <Input
                              id="editExamQuota"
                              type="number"
                              value={editExamType.monthlyQuota}
                              onChange={(e) => setEditExamType({ ...editExamType, monthlyQuota: e.target.value })}
                              placeholder="Número máximo por mês"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editExamPrice">Preço (R$)</Label>
                            <Input
                              id="editExamPrice"
                              type="number"
                              step="0.01"
                              value={editExamType.displayPrice || (editExamType.price / 100).toFixed(2)}
                              onChange={(e) => {
                                const value = e.target.value;
                                console.log('Price input changed:', value);
                                setEditExamType({ 
                                  ...editExamType, 
                                  displayPrice: value,
                                  price: parseFloat(value) * 100 || 0 
                                });
                              }}
                              placeholder="Preço unitário"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="editExamApproval"
                              checked={editExamType.needsSecretaryApproval}
                              onCheckedChange={(checked) => 
                                setEditExamType({ ...editExamType, needsSecretaryApproval: !!checked })
                              }
                            />
                            <Label htmlFor="editExamApproval">Requer aprovação da secretaria</Label>
                          </div>
                          <Button
                            onClick={() => updateExamTypeMutation.mutate(editExamType)}
                            disabled={updateExamTypeMutation.isPending}
                            className="w-full"
                          >
                            {updateExamTypeMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                {/* Consultation Types */}
                <TabsContent value="consultation-types" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Tipos de Consultas</h2>
                    <Dialog open={showConsultationDialog} onOpenChange={setShowConsultationDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Consulta
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Novo Tipo de Consulta</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="consultationName">Nome da Consulta</Label>
                            <Input
                              id="consultationName"
                              value={newConsultationType.name}
                              onChange={(e) => setNewConsultationType({ ...newConsultationType, name: e.target.value })}
                              placeholder="Nome da consulta"
                            />
                          </div>
                          <div>
                            <Label htmlFor="consultationDescription">Descrição</Label>
                            <Textarea
                              id="consultationDescription"
                              value={newConsultationType.description}
                              onChange={(e) => setNewConsultationType({ ...newConsultationType, description: e.target.value })}
                              placeholder="Descrição da consulta"
                            />
                          </div>
                          <div>
                            <Label htmlFor="consultationQuota">Cota Mensal</Label>
                            <Input
                              id="consultationQuota"
                              type="number"
                              value={newConsultationType.monthlyQuota}
                              onChange={(e) => setNewConsultationType({ ...newConsultationType, monthlyQuota: e.target.value })}
                              placeholder="Número máximo por mês"
                            />
                          </div>
                          <div>
                            <Label htmlFor="consultationPrice">Preço (R$)</Label>
                            <Input
                              id="consultationPrice"
                              type="number"
                              step="0.01"
                              value={newConsultationType.price}
                              onChange={(e) => setNewConsultationType({ ...newConsultationType, price: e.target.value })}
                              placeholder="Preço unitário"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="consultationApproval"
                              checked={newConsultationType.needsSecretaryApproval}
                              onCheckedChange={(checked) => 
                                setNewConsultationType({ ...newConsultationType, needsSecretaryApproval: !!checked })
                              }
                            />
                            <Label htmlFor="consultationApproval">Requer aprovação da secretaria</Label>
                          </div>
                          <Button
                            onClick={() => createConsultationTypeMutation.mutate(newConsultationType)}
                            disabled={createConsultationTypeMutation.isPending}
                            className="w-full"
                          >
                            {createConsultationTypeMutation.isPending ? "Criando..." : "Criar Consulta"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Card>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Cota</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead>Aprovação</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(consultationTypes) && consultationTypes.map((consultation: any) => (
                            <TableRow key={consultation.id}>
                              <TableCell className="font-medium">{consultation.name}</TableCell>
                              <TableCell>{consultation.description}</TableCell>
                              <TableCell>{consultation.monthlyQuota}</TableCell>
                              <TableCell>{formatCurrency(consultation.price || 0)}</TableCell>
                              <TableCell>
                                {consultation.needsSecretaryApproval ? (
                                  <Badge variant="secondary">Requer</Badge>
                                ) : (
                                  <Badge variant="outline">Não requer</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditConsultationType({
                                        ...consultation,
                                        displayPrice: (consultation.price / 100).toFixed(2)
                                      });
                                      setShowEditConsultationModal(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteConsultationTypeMutation.mutate(consultation.id)}
                                    disabled={deleteConsultationTypeMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Edit Consultation Type Modal */}
                  <Dialog open={showEditConsultationModal} onOpenChange={setShowEditConsultationModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Tipo de Consulta</DialogTitle>
                      </DialogHeader>
                      {editConsultationType && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="editConsultationName">Nome da Consulta</Label>
                            <Input
                              id="editConsultationName"
                              value={editConsultationType.name}
                              onChange={(e) => setEditConsultationType({ ...editConsultationType, name: e.target.value })}
                              placeholder="Nome da consulta"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editConsultationDescription">Descrição</Label>
                            <Textarea
                              id="editConsultationDescription"
                              value={editConsultationType.description}
                              onChange={(e) => setEditConsultationType({ ...editConsultationType, description: e.target.value })}
                              placeholder="Descrição da consulta"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editConsultationQuota">Cota Mensal</Label>
                            <Input
                              id="editConsultationQuota"
                              type="number"
                              value={editConsultationType.monthlyQuota}
                              onChange={(e) => setEditConsultationType({ ...editConsultationType, monthlyQuota: e.target.value })}
                              placeholder="Número máximo por mês"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editConsultationPrice">Preço (R$)</Label>
                            <Input
                              id="editConsultationPrice"
                              type="number"
                              step="0.01"
                              value={editConsultationType.displayPrice || (editConsultationType.price / 100).toFixed(2)}
                              onChange={(e) => {
                                const value = e.target.value;
                                console.log('Consultation price input changed:', value);
                                setEditConsultationType({ 
                                  ...editConsultationType, 
                                  displayPrice: value,
                                  price: parseFloat(value) * 100 || 0 
                                });
                              }}
                              placeholder="Preço unitário"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="editConsultationApproval"
                              checked={editConsultationType.needsSecretaryApproval}
                              onCheckedChange={(checked) => 
                                setEditConsultationType({ ...editConsultationType, needsSecretaryApproval: !!checked })
                              }
                            />
                            <Label htmlFor="editConsultationApproval">Requer aprovação da secretaria</Label>
                          </div>
                          <Button
                            onClick={() => updateConsultationTypeMutation.mutate(editConsultationType)}
                            disabled={updateConsultationTypeMutation.isPending}
                            className="w-full"
                          >
                            {updateConsultationTypeMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                {/* Users */}
                <TabsContent value="users" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Usuários do Sistema</h2>
                    <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Novo Usuário
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Criar Novo Usuário</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="username">Nome de Usuário</Label>
                            <Input
                              id="username"
                              value={newUser.username}
                              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                              placeholder="Nome de usuário"
                            />
                          </div>
                          <div>
                            <Label htmlFor="password">Senha</Label>
                            <Input
                              id="password"
                              type="password"
                              value={newUser.password}
                              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                              placeholder="Senha"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newUser.email}
                              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                              placeholder="Email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="role">Função</Label>
                            <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="recepcao">Recepção UBS</SelectItem>
                                <SelectItem value="regulacao">Setor Regulação</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="firstName">Nome</Label>
                            <Input
                              id="firstName"
                              value={newUser.firstName}
                              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                              placeholder="Nome"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Sobrenome</Label>
                            <Input
                              id="lastName"
                              value={newUser.lastName}
                              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                              placeholder="Sobrenome"
                            />
                          </div>

                          <div>
                            <Label htmlFor="healthUnit">Unidade de Saúde</Label>
                            <Select value={newUser.healthUnitId} onValueChange={(value) => setNewUser({ ...newUser, healthUnitId: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(healthUnits) && healthUnits.map((unit: any) => (
                                  <SelectItem key={unit.id} value={unit.id.toString()}>
                                    {unit.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          onClick={() => createUserMutation.mutate(newUser)}
                          disabled={createUserMutation.isPending}
                          className="w-full mt-4"
                        >
                          {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Card>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(allUsers) && allUsers.map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                {user.firstName} {user.lastName}
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{user.role}</Badge>
                              </TableCell>
                              <TableCell>
                                {Array.isArray(healthUnits) && healthUnits.find((unit: any) => unit.id === user.healthUnitId)?.name || '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditUser({
                                        ...user,
                                        healthUnitId: user.healthUnitId?.toString() || ""
                                      });
                                      setShowEditUserModal(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                    disabled={deleteUserMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Edit User Modal */}
                  <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                      </DialogHeader>
                      {editUser && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="editUsername">Nome de Usuário</Label>
                            <Input
                              id="editUsername"
                              value={editUser.username}
                              onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                              placeholder="Nome de usuário"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editUserEmail">Email</Label>
                            <Input
                              id="editUserEmail"
                              type="email"
                              value={editUser.email}
                              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                              placeholder="Email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editUserRole">Função</Label>
                            <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="recepcao">Recepção UBS</SelectItem>
                                <SelectItem value="regulacao">Setor Regulação</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="editUserPassword">Nova Senha (deixe vazio para não alterar)</Label>
                            <Input
                              id="editUserPassword"
                              type="password"
                              value={editUser.password || ""}
                              onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                              placeholder="Nova senha"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editUserFirstName">Nome</Label>
                            <Input
                              id="editUserFirstName"
                              value={editUser.firstName}
                              onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                              placeholder="Nome"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editUserLastName">Sobrenome</Label>
                            <Input
                              id="editUserLastName"
                              value={editUser.lastName}
                              onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                              placeholder="Sobrenome"
                            />
                          </div>

                          <div>
                            <Label htmlFor="editUserHealthUnit">Unidade de Saúde</Label>
                            <Select value={editUser.healthUnitId || "none"} onValueChange={(value) => setEditUser({ ...editUser, healthUnitId: value === "none" ? "" : value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhuma unidade</SelectItem>
                                {Array.isArray(healthUnits) && healthUnits.map((unit: any) => (
                                  <SelectItem key={unit.id} value={unit.id.toString()}>
                                    {unit.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={() => updateUserMutation.mutate(editUser)}
                        disabled={updateUserMutation.isPending}
                        className="w-full mt-4"
                      >
                        {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </DialogContent>
                  </Dialog>
                </TabsContent>
              </Tabs>
            </TabsContent>

          {/* Backup Tab */}
          <TabsContent value="backup">
            <BackupRestore />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Log de Atividades Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {safeActivityLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        <Activity className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{log.actionDescription || log.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatLogDate(log.date || log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {safeActivityLogs.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma atividade registrada.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Gerenciar Notificações
                    </CardTitle>
                    <Button 
                      onClick={() => setIsNotificationModalOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Notificação
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleNotificationMutation.mutate(notification.id)}
                              >
                                {notification.isActive ? 
                                  <Eye className="h-4 w-4 text-green-600" /> : 
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                }
                              </Button>
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
                </CardContent>
              </Card>
            </div>

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
          </TabsContent>
        </Tabs>
      </div>
      


      {/* Forward Request Modal */}
      <Dialog open={isForwardModalOpen} onOpenChange={setIsForwardModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Encaminhar Requisição</DialogTitle>
            <p className="text-sm text-gray-600">
              Encaminhe a requisição de {forwardingRequest?.patient?.name} para outro mês
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forwardMonth">Mês de Destino</Label>
              <Select value={forwardMonth} onValueChange={setForwardMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="forwardYear">Ano de Destino</Label>
              <Select value={forwardYear} onValueChange={setForwardYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="forwardReason">Motivo (opcional)</Label>
              <Textarea
                id="forwardReason"
                placeholder="Digite o motivo do encaminhamento..."
                value={forwardReason}
                onChange={(e) => setForwardReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsForwardModalOpen(false);
                  setForwardingRequest(null);
                  setForwardMonth('');
                  setForwardYear('');
                  setForwardReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (forwardingRequest && forwardMonth && forwardYear) {
                    forwardRequestMutation.mutate({
                      id: forwardingRequest.id,
                      month: parseInt(forwardMonth),
                      year: parseInt(forwardYear),
                      reason: forwardReason || undefined
                    });
                  }
                }}
                disabled={!forwardMonth || !forwardYear || forwardRequestMutation.isPending}
              >
                {forwardRequestMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Encaminhando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Encaminhar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Details Modal for clicked patient names */}
      {selectedPatientId && (
        <PatientDetailsModal
          patientId={selectedPatientId}
          isOpen={isPatientModalOpen}
          onClose={() => {
            setIsPatientModalOpen(false);
            setSelectedPatientId(null);
          }}
          onPatientUpdate={() => {
            // Refetch relevant data when patient is updated
            queryClient.invalidateQueries({ queryKey: ['/api/secretary/pending-requests'] });
            queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
          }}
        />
      )}

      {/* Patient Details Modal */}
      {selectedPatient && (
        <PatientDetailsModal
          patient={selectedPatient}
          isOpen={isPatientDetailModalOpen}
          onClose={() => {
            setIsPatientDetailModalOpen(false);
            setSelectedPatient(null);
          }}
          onPatientUpdate={() => {
            refetchPatients();
          }}
        />
      )}

    </div>
  );
}