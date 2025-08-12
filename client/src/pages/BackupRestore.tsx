import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Database, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DatabaseStatus, BackupFile, BackupCreateResponse } from "@shared/types";

export default function BackupRestore() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check database status
  const { data: dbStatus, isLoading: statusLoading } = useQuery<DatabaseStatus>({
    queryKey: ["/api/database/status"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // List existing backups
  const { data: backups, isLoading: backupsLoading } = useQuery<BackupFile[]>({
    queryKey: ["/api/database/backups"],
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (): Promise<BackupCreateResponse> => {
      const response = await fetch("/api/database/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar backup");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Criado",
        description: `Backup ${data.filename} criado com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/database/backups"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
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
        title: "Backup Restaurado",
        description: "Banco de dados restaurado com sucesso",
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/database/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/database/backups"] });
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
      // Validate file type
      if (!file.name.endsWith('.sql')) {
        toast({
          title: "Arquivo Inválido",
          description: "Apenas arquivos .sql são aceitos para restauração",
          variant: "destructive",
        });
        event.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "Arquivo Muito Grande",
          description: "O arquivo deve ter no máximo 100MB",
          variant: "destructive",
        });
        event.target.value = ''; // Clear the input
        return;
      }
      
      setSelectedFile(file);
      toast({
        title: "Arquivo Selecionado",
        description: `${file.name} (${formatFileSize(file.size)}) pronto para restauração`,
      });
    }
  };

  const handleRestore = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('backup', selectedFile);
    restoreBackupMutation.mutate(formData);
  };

  const downloadBackup = async (filename: string) => {
    setDownloading(filename);
    try {
      // Create a direct download link
      const response = await fetch(`/api/database/backup/${filename}`);
      
      if (!response.ok) {
        throw new Error('Erro ao baixar backup');
      }

      // Get the file blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({
        title: "Download Concluído",
        description: `Backup ${filename} foi baixado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro no Download",
        description: "Não foi possível baixar o backup",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const downloadAllBackups = async () => {
    if (!backups || backups.length === 0) return;
    
    toast({
      title: "Download em Lote",
      description: `Iniciando download de ${backups.length} backup(s)`,
    });

    for (const backup of backups) {
      await downloadBackup(backup.filename);
      // Small delay between downloads to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Backup e Restauração</h1>
      </div>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status do Banco de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Verificando conexão...</span>
            </div>
          ) : (
            <Alert className={dbStatus?.connected ? "border-green-500" : "border-red-500"}>
              {dbStatus?.connected ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                {dbStatus?.message || "Status desconhecido"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Create Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Criar Backup
          </CardTitle>
          <CardDescription>
            Gera um backup completo do banco de dados atual incluindo todas as tabelas, dados e configurações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">O que será incluído no backup:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Todos os dados de pacientes e requisições</li>
              <li>• Configurações de usuários e permissões</li>
              <li>• Tipos de exames e consultas</li>
              <li>• Histórico de atividades do sistema</li>
              <li>• Estrutura completa do banco de dados</li>
            </ul>
          </div>
          
          <Button 
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending || !dbStatus?.connected}
            className="w-full"
            size="lg"
          >
            {createBackupMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Criando Backup...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Criar Backup Completo
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Recomendado: Criar backup antes de atualizações importantes do sistema
          </p>
        </CardContent>
      </Card>

      {/* Restore Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restaurar Backup
          </CardTitle>
          <CardDescription>
            Restaura o banco de dados a partir de um arquivo de backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="backup-file">Selecionar Arquivo de Backup (.sql)</Label>
            <Input
              id="backup-file"
              type="file"
              accept=".sql"
              onChange={handleFileSelect}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Apenas arquivos .sql até 100MB são aceitos
            </p>
          </div>
          
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <h4 className="font-medium text-amber-900 mb-1">⚠️ Importante:</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• A restauração adiciona dados ao banco atual (não substitui)</li>
              <li>• Registros duplicados podem gerar avisos normais</li>
              <li>• Recomenda-se fazer backup antes de restaurar</li>
              <li>• Processo pode levar alguns minutos</li>
            </ul>
          </div>

          {selectedFile && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Arquivo selecionado:</strong> {selectedFile.name}
              </p>
              <p className="text-sm text-green-600">
                Tamanho: {formatFileSize(selectedFile.size)}
              </p>
            </div>
          )}

          <Button 
            onClick={handleRestore}
            disabled={!selectedFile || restoreBackupMutation.isPending || !dbStatus?.connected}
            className="w-full"
            size="lg"
          >
            {restoreBackupMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Restaurando Backup...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Restaurar Backup
              </>
            )}
          </Button>
          
          {restoreBackupMutation.isPending && (
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-sm text-blue-700">
                Aguarde... O processo pode levar alguns minutos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Backups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backups Disponíveis</CardTitle>
              <CardDescription>
                Lista de backups criados anteriormente
              </CardDescription>
            </div>
            {backups && backups.length > 1 && (
              <Button
                variant="outline"
                onClick={downloadAllBackups}
                disabled={downloading !== null}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Carregando backups...</span>
            </div>
          ) : !backups || backups.length === 0 ? (
            <p className="text-muted-foreground">Nenhum backup encontrado</p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-4 w-4 text-blue-500" />
                      <p className="font-medium">{backup.filename}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(backup.size)}</span>
                      <span>•</span>
                      <span>{new Date(backup.created).toLocaleString('pt-BR')}</span>
                      <span>•</span>
                      <span className="text-green-600">Válido</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBackup(backup.filename)}
                      disabled={downloading === backup.filename}
                      className="hover:bg-blue-50"
                    >
                      {downloading === backup.filename ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-1"></div>
                          Baixando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}