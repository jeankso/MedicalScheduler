import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Smartphone, 
  Search, 
  User, 
  ArrowLeft,
  Stethoscope,
  UserPlus,
  Phone,
  MapPin,
  CheckCircle
} from "lucide-react";

export default function SimpleMobilePanel() {
  const [currentStep, setCurrentStep] = useState<'search' | 'register' | 'request'>('search');
  const [cpf, setCpf] = useState("");
  const [patientFound, setPatientFound] = useState(false);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    if (formatted.length <= 14) {
      setCpf(formatted);
    }
  };

  const handleSearch = () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      // Simular busca
      setPatientFound(true);
      setCurrentStep('request');
    }
  };

  const handleBack = () => {
    setCurrentStep('search');
    setCpf("");
    setPatientFound(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-4 shadow-lg">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-6 w-6" />
              <div>
                <h1 className="text-lg font-bold">Painel Mobile</h1>
                <p className="text-green-100 text-sm">Requisições UBS</p>
              </div>
            </div>
            {currentStep !== 'search' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBack}
                className="text-white hover:bg-green-500"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {currentStep === 'search' && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span>Buscar Paciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cpf">CPF do Paciente</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  className="text-center text-lg"
                />
              </div>
              
              <Button 
                onClick={handleSearch}
                disabled={cpf.replace(/\D/g, '').length !== 11}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Paciente
              </Button>

              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('register')}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Novo Paciente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'register' && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                <span>Novo Paciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" placeholder="Digite o nome completo" />
              </div>
              
              <div>
                <Label htmlFor="social-name">Nome Social</Label>
                <Input id="social-name" placeholder="Nome social (opcional)" />
              </div>
              
              <div>
                <Label htmlFor="reg-cpf">CPF *</Label>
                <Input id="reg-cpf" placeholder="000.000.000-00" />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" placeholder="(00) 00000-0000" />
              </div>
              
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" placeholder="Rua, número, bairro" />
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar Paciente
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'request' && (
          <div className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Paciente Encontrado</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Nome:</strong> João da Silva</p>
                  <p><strong>CPF:</strong> {cpf}</p>
                  <p><strong>Telefone:</strong> (84) 99999-9999</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5 text-green-600" />
                  <span>Nova Requisição</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de Atendimento</Label>
                  <div className="space-y-2 mt-2">
                    <Button variant="outline" className="w-full justify-start">
                      Exame de Sangue
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Consulta Cardiológica
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Ultrassom
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Input id="notes" placeholder="Observações adicionais..." />
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Criar Requisição
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center mt-6">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Página Inicial
          </Button>
        </div>
      </div>
    </div>
  );
}