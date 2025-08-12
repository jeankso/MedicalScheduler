import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Camera, X, Eye, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RequestDocumentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

export default function RequestDocumentManager({ isOpen, onClose, request }: RequestDocumentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File }>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanTarget, setCurrentScanTarget] = useState<string | null>(null);
  
  // Refs para inputs de arquivo
  const frontIdRef = useRef<HTMLInputElement>(null);
  const backIdRef = useRef<HTMLInputElement>(null);
  const examAttachmentRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!request || !request.patient) return null;

  const patient = request.patient;
  const examType = request.examType;
  const consultationType = request.consultationType;
  const serviceName = examType?.name || consultationType?.name;

  // Mutation para upload de fotos de identidade
  const uploadIdPhotoMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'front' | 'back' }) => {
      const formData = new FormData();
      formData.append('file', file);
      return await apiRequest(`/api/patients/${patient.id}/upload-${type}-id`, "POST", formData);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Sucesso",
        description: `Foto da identidade ${variables.type === 'front' ? 'frente' : 'verso'} enviada com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setSelectedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[`id-${variables.type}`];
        return newFiles;
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao enviar foto da identidade: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: (_, __, variables) => {
      setUploading(prev => ({ ...prev, [`id-${variables.type}`]: false }));
    }
  });

  // Mutation para upload de anexo do exame
  const uploadExamAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return await apiRequest(`/api/requests/${request.id}/upload-attachment`, "POST", formData);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Anexo do exame enviado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setSelectedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles['exam-attachment'];
        return newFiles;
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao enviar anexo: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUploading(prev => ({ ...prev, 'exam-attachment': false }));
    }
  });

  // Função para inicializar scanner/câmera
  const startScanning = async (target: string) => {
    try {
      setCurrentScanTarget(target);
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Câmera traseira
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
      });
      setIsScanning(false);
      setCurrentScanTarget(null);
    }
  };

  // Função para capturar imagem da câmera
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !currentScanTarget) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Definir tamanho do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capturar frame atual do vídeo
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = Date.now();
        const file = new File([blob], `scan-${currentScanTarget}-${timestamp}.jpg`, { type: 'image/jpeg' });
        
        setSelectedFiles(prev => ({
          ...prev,
          [currentScanTarget]: file
        }));
        
        toast({
          title: "Imagem capturada",
          description: "Imagem capturada com sucesso. Clique em 'Enviar' para fazer upload.",
        });
      }
    }, 'image/jpeg', 0.9);

    stopScanning();
  };

  // Função para parar o scanner
  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setCurrentScanTarget(null);
  };

  // Função para processar seleção de arquivo
  const handleFileSelect = (target: string, file: File | null) => {
    if (file) {
      setSelectedFiles(prev => ({
        ...prev,
        [target]: file
      }));
    }
  };

  // Função para enviar arquivo
  const handleUpload = (target: string) => {
    const file = selectedFiles[target];
    if (!file) return;

    setUploading(prev => ({ ...prev, [target]: true }));

    if (target === 'id-front') {
      uploadIdPhotoMutation.mutate({ file, type: 'front' });
    } else if (target === 'id-back') {
      uploadIdPhotoMutation.mutate({ file, type: 'back' });
    } else if (target === 'exam-attachment') {
      uploadExamAttachmentMutation.mutate(file);
    }
  };

  const removeSelectedFile = (target: string) => {
    setSelectedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[target];
      return newFiles;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Documentos - {patient.name}</DialogTitle>
          <p className="text-sm text-gray-600">
            Exame/Consulta: {serviceName}
          </p>
        </DialogHeader>

        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="identity">Identidade (Obrigatório)</TabsTrigger>
            <TabsTrigger value="attachment">Anexo do Exame</TabsTrigger>
          </TabsList>

          {/* Aba de Identidade */}
          <TabsContent value="identity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Frente da Identidade */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-red-600">
                  Frente da Identidade *
                </Label>
                
                {patient.frontIdPhotoFileName && (
                  <div className="mb-4">
                    <p className="text-sm text-green-600 mb-2">✓ Arquivo atual: {patient.frontIdPhotoFileName}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/patients/${patient.id}/front-id-photo`, '_blank')}
                      className="mr-2"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={() => startScanning('id-front')}
                    disabled={isScanning}
                    className="w-full"
                    variant="outline"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Escanear/Fotografar
                  </Button>
                  
                  <Button
                    onClick={() => frontIdRef.current?.click()}
                    disabled={isScanning}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                  
                  <Input
                    ref={frontIdRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect('id-front', e.target.files?.[0] || null)}
                  />
                </div>

                {selectedFiles['id-front'] && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {selectedFiles['id-front'].name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSelectedFile('id-front')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <img
                      src={URL.createObjectURL(selectedFiles['id-front'])}
                      alt="Preview"
                      className="mt-2 max-w-full h-40 object-cover rounded"
                    />
                    <Button
                      onClick={() => handleUpload('id-front')}
                      disabled={uploading['id-front']}
                      className="w-full mt-2"
                    >
                      {uploading['id-front'] ? 'Enviando...' : 'Enviar Frente'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Verso da Identidade */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-red-600">
                  Verso da Identidade *
                </Label>
                
                {patient.backIdPhotoFileName && (
                  <div className="mb-4">
                    <p className="text-sm text-green-600 mb-2">✓ Arquivo atual: {patient.backIdPhotoFileName}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/patients/${patient.id}/back-id-photo`, '_blank')}
                      className="mr-2"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={() => startScanning('id-back')}
                    disabled={isScanning}
                    className="w-full"
                    variant="outline"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Escanear/Fotografar
                  </Button>
                  
                  <Button
                    onClick={() => backIdRef.current?.click()}
                    disabled={isScanning}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                  
                  <Input
                    ref={backIdRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect('id-back', e.target.files?.[0] || null)}
                  />
                </div>

                {selectedFiles['id-back'] && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {selectedFiles['id-back'].name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSelectedFile('id-back')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <img
                      src={URL.createObjectURL(selectedFiles['id-back'])}
                      alt="Preview"
                      className="mt-2 max-w-full h-40 object-cover rounded"
                    />
                    <Button
                      onClick={() => handleUpload('id-back')}
                      disabled={uploading['id-back']}
                      className="w-full mt-2"
                    >
                      {uploading['id-back'] ? 'Enviando...' : 'Enviar Verso'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba de Anexo do Exame */}
          <TabsContent value="attachment" className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">
                Anexo para: {serviceName}
              </Label>
              
              {request.attachmentFileName && (
                <div className="mb-4">
                  <p className="text-sm text-green-600 mb-2">✓ Arquivo atual: {request.attachmentFileName}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/api/requests/${request.id}/view-attachment`, '_blank')}
                    className="mr-2"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={() => startScanning('exam-attachment')}
                  disabled={isScanning}
                  className="w-full"
                  variant="outline"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Escanear/Fotografar Documento
                </Button>
                
                <Button
                  onClick={() => examAttachmentRef.current?.click()}
                  disabled={isScanning}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </Button>
                
                <Input
                  ref={examAttachmentRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect('exam-attachment', e.target.files?.[0] || null)}
                />
              </div>

              {selectedFiles['exam-attachment'] && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {selectedFiles['exam-attachment'].name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSelectedFile('exam-attachment')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {selectedFiles['exam-attachment'].type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(selectedFiles['exam-attachment'])}
                      alt="Preview"
                      className="mt-2 max-w-full h-40 object-cover rounded"
                    />
                  )}
                  {selectedFiles['exam-attachment'].type === 'application/pdf' && (
                    <div className="mt-2 p-4 bg-gray-100 rounded flex items-center">
                      <FileText className="w-8 h-8 mr-2" />
                      <span>Arquivo PDF selecionado</span>
                    </div>
                  )}
                  <Button
                    onClick={() => handleUpload('exam-attachment')}
                    disabled={uploading['exam-attachment']}
                    className="w-full mt-2"
                  >
                    {uploading['exam-attachment'] ? 'Enviando...' : 'Enviar Anexo'}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Scanner/Câmera Modal */}
        {isScanning && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Capturar Imagem - {currentScanTarget?.includes('id') ? 'Identidade' : 'Anexo'}
                </h3>
                <Button onClick={stopScanning} variant="ghost" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  className="w-full max-h-96 bg-black rounded"
                  autoPlay
                  playsInline
                  muted
                />
                
                <div className="flex space-x-2">
                  <Button onClick={captureImage} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar
                  </Button>
                  <Button onClick={stopScanning} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}