import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database, Upload, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DatabaseSetup() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    dbName: 'health_system',
    dbUser: 'health_admin', 
    dbPassword: ''
  });
  const { toast } = useToast();

  // Check database status
  const { data: dbStatus, isLoading: statusLoading, refetch } = useQuery<{connected: boolean; message: string}>({
    queryKey: ["/api/database/status"],
    retry: 2,
    refetchInterval: false,
    staleTime: 10000,
  });

  // Database setup mutation
  const setupMutation = useMutation({
    mutationFn: async (config?: typeof dbConfig) => {
      const response = await fetch("/api/database/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config || {}),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar banco de dados");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      const envMessage = data.envCreated ? 
        `${data.message} | Arquivo .env criado automaticamente` : 
        data.message;
      
      toast({
        title: "Sucesso!",
        description: envMessage,
      });
      
      // Show additional details if available
      if (data.details) {
        setTimeout(() => {
          toast({
            title: "Detalhes da Configuração",
            description: data.details,
          });
        }, 1500);
      }
      
      // Invalidate all queries to force refresh
      queryClient.invalidateQueries();
      // Force refetch of database status
      setTimeout(() => {
        refetch();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar banco de dados",
        variant: "destructive",
      });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (formData: FormData) => 
      fetch("/api/database/restore", {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Erro ao restaurar backup");
        }
        return res.json();
      }),
    onSuccess: () => {
      toast({
        title: "Banco Restaurado",
        description: "Banco de dados configurado com sucesso",
      });
      setSelectedFile(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql')) {
        toast({
          title: "Arquivo Inválido",
          description: "Apenas arquivos .sql são aceitos",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRestore = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('backup', selectedFile);
    restoreBackupMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mb-4"></div>
          <p className="text-lg">Verificando banco de dados...</p>
        </div>
      </div>
    );
  }

  // If database is connected, the parent DatabaseCheck component will handle routing
  // This component should not be visible when database is connected

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Database className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">
            Configuração Inicial
          </h1>
          <p className="text-gray-600 mt-2">
            Sistema de Saúde - Alexandria/RN
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Banco de Dados Não Conectado
            </CardTitle>
            <CardDescription>
              É necessário configurar o banco de dados antes de usar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription>
                {dbStatus?.message || "Não foi possível conectar ao banco de dados"}
              </AlertDescription>
            </Alert>

            {/* Opção 1: Configuração personalizada do banco */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Configuração do Banco de Dados
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                Configure o nome do banco, usuário e senha para criação automática.
              </p>
              
              <div className="space-y-3 mb-4">
                <div>
                  <Label htmlFor="dbName" className="text-sm font-medium text-blue-900">
                    Nome do Banco
                  </Label>
                  <Input
                    id="dbName"
                    value={dbConfig.dbName}
                    onChange={(e) => setDbConfig(prev => ({ ...prev, dbName: e.target.value }))}
                    placeholder="health_system"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dbUser" className="text-sm font-medium text-blue-900">
                    Usuário do Banco
                  </Label>
                  <Input
                    id="dbUser"
                    value={dbConfig.dbUser}
                    onChange={(e) => setDbConfig(prev => ({ ...prev, dbUser: e.target.value }))}
                    placeholder="health_admin"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dbPassword" className="text-sm font-medium text-blue-900">
                    Senha do Banco
                  </Label>
                  <Input
                    id="dbPassword"
                    type="password"
                    value={dbConfig.dbPassword}
                    onChange={(e) => setDbConfig(prev => ({ ...prev, dbPassword: e.target.value }))}
                    placeholder="Digite uma senha segura"
                    className="mt-1"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    {dbConfig.dbPassword.length === 0 ? 'Senha será gerada automaticamente se deixar em branco' : 
                     dbConfig.dbPassword.length < 8 ? 'Senha muito curta (mínimo 8 caracteres)' : 'Senha adequada'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setupMutation.mutate(undefined)}
                  disabled={setupMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {setupMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Criar com Configuração Padrão
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => setupMutation.mutate(dbConfig)}
                  disabled={setupMutation.isPending || !dbConfig.dbName.trim() || !dbConfig.dbUser.trim() || 
                           Boolean(dbConfig.dbPassword && dbConfig.dbPassword.length < 8)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {setupMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Criar com Config Personalizada
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-2 text-xs text-blue-600 space-y-1">
                <div>✓ Cria todas as tabelas necessárias</div>
                <div>✓ Insere dados iniciais (tipos de exames, consultas)</div>
                <div>✓ Cria usuário admin padrão (admin/admin123)</div>
                <div>✓ Configuração personalizada do PostgreSQL</div>
              </div>
            </div>

            <div className="text-center text-gray-500">
              <span className="text-sm">ou</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Upload className="h-5 w-5" />
              Restaurar de Backup (Alternativo)
            </CardTitle>
            <CardDescription>
              Se você possui um arquivo de backup, pode restaurar dados existentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="backup-file">Arquivo de Backup (.sql)</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".sql"
                onChange={handleFileSelect}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Selecione um arquivo de backup do sistema para restaurar
              </p>
            </div>
            
            {selectedFile && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Arquivo selecionado: <strong>{selectedFile.name}</strong> 
                  <br />
                  Tamanho: {formatFileSize(selectedFile.size)}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleRestore}
              disabled={!selectedFile || restoreBackupMutation.isPending}
              className="w-full"
            >
              {restoreBackupMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Configurando Banco...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Configurar Banco de Dados
                </>
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="text-sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Verificar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>
            Prefeitura Municipal de Alexandria/RN
            <br />
            Sistema de Requisições de Saúde
          </p>
        </div>
      </div>
    </div>
  );
}