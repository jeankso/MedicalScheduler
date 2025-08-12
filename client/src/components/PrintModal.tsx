import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestData: {
    patientName: string;
    patientSocialName?: string;
    patientAge: string;
    patientPhone: string;
    examType: string;
    consultationType: string;
    doctorName: string;
    healthUnit: string;
    healthUnitAddress: string;
    date: string;
  };
}

export default function PrintModal({ isOpen, onClose, requestData }: PrintModalProps) {
  const handlePrint = () => {
    const printContent = document.getElementById('printContent');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>Requisição de Exame/Consulta</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                line-height: 1.5;
              }
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
              }
              .field { 
                margin-bottom: 15px; 
                display: flex; 
                align-items: center;
              }
              .label { 
                font-weight: bold; 
                width: 150px; 
                display: inline-block;
              }
              .value { 
                border-bottom: 1px solid #333; 
                flex: 1; 
                padding-bottom: 2px;
                margin-left: 10px;
              }
              .signature { 
                margin-top: 50px; 
                text-align: center;
              }
              .signature-line { 
                border-bottom: 1px solid #333; 
                width: 300px; 
                margin: 20px auto 5px;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
    onClose();
  };

  const getRequestType = () => {
    if (requestData.examType && requestData.consultationType) {
      return `Exame: ${requestData.examType} | Consulta: ${requestData.consultationType}`;
    } else if (requestData.examType) {
      return `Exame: ${requestData.examType}`;
    } else if (requestData.consultationType) {
      return `Consulta: ${requestData.consultationType}`;
    }
    return "Não especificado";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Requisição de Exame/Consulta</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>
        
        <div id="printContent" className="space-y-6 p-6 bg-white">
          <div className="header text-center border-b-2 border-gray-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">SECRETARIA MUNICIPAL DE SAÚDE</h1>
            <h2 className="text-lg font-semibold text-gray-700 mt-2">REQUISIÇÃO DE EXAME/CONSULTA</h2>
          </div>
          
          <div className="space-y-4">
            <div className="field flex items-center">
              <span className="label font-bold w-32">Unidade de Saúde:</span>
              <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                {requestData.healthUnit}
              </div>
            </div>
            
            <div className="field flex items-center">
              <span className="label font-bold w-32">Endereço:</span>
              <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                {requestData.healthUnitAddress}
              </div>
            </div>
            
            <div className="field flex items-center">
              <span className="label font-bold w-32">Data da Requisição:</span>
              <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                {requestData.date}
              </div>
            </div>
            
            <div className="field flex items-center">
              <span className="label font-bold w-32">Nome do Paciente:</span>
              <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                {requestData.patientName}
              </div>
            </div>
            
            {requestData.patientSocialName && (
              <div className="field flex items-center">
                <span className="label font-bold w-32">Apelido:</span>
                <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                  {requestData.patientSocialName}
                </div>
              </div>
            )}
            
            <div className="field flex items-center">
              <span className="label font-bold w-32">Idade:</span>
              <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                {requestData.patientAge} anos
              </div>
            </div>
            
            <div className="field flex items-center">
              <span className="label font-bold w-32">Telefone:</span>
              <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                {requestData.patientPhone}
              </div>
            </div>
            
            <div className="field flex items-center">
              <span className="label font-bold w-32">Solicitação:</span>
              <div className="value flex-1 border-b border-gray-900 pb-1 ml-2">
                {getRequestType()}
              </div>
            </div>
          </div>
          
          <div className="signature mt-12 pt-8 border-t border-gray-300">
            <div className="text-center">
              <div className="signature-line border-b border-gray-900 w-64 mx-auto mb-2"></div>
              <p className="text-sm font-medium">{requestData.doctorName}</p>
              <p className="text-xs text-gray-600">Assinatura do Médico</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2" size={16} />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
