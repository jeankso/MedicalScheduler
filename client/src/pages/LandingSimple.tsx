import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, MapPin, Building2, Users, Smartphone } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  // Atalho oculto Ctrl+Alt+G para acessar configuração do banco
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        window.location.href = '/database-setup';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header com acesso ao sistema no canto */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-4 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center">
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Prefeitura de Alexandria</h1>
                <p className="text-green-100 text-sm">Secretaria Municipal de Saúde</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                className="bg-white text-green-700 border-white hover:bg-green-50"
                onClick={() => setLocation('/mobile-requests')}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Painel Mobile
              </Button>
              <Button 
                variant="outline" 
                className="bg-white text-green-700 border-white hover:bg-green-50"
                onClick={() => window.location.href = '/login'}
              >
                <Users className="h-4 w-4 mr-2" />
                Acesso ao Sistema
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full space-y-12">
          {/* Logo e Título Principal */}
          <div className="text-center">
            <div className="mb-6">
              <div className="h-20 w-20 mx-auto mb-4 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">SMS</span>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Sistema de Saúde</h2>
            <div className="flex items-center justify-center space-x-2 text-gray-600 mb-2">
              <MapPin className="h-5 w-5" />
              <span className="text-lg">Alexandria/RN</span>
            </div>
            <p className="text-gray-600 text-lg">Plataforma digital para gerenciamento de exames e consultas</p>
          </div>

          {/* Card Principal - Informações do Sistema */}
          <Card className="w-full shadow-xl border border-gray-200 bg-white">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                <div className="text-center">
                  <Stethoscope className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Sistema de Requisições de Saúde</h3>
                  <p className="text-gray-600">
                    Plataforma digital para gerenciamento de exames e consultas da Secretaria Municipal de Saúde
                  </p>
                </div>

                {/* Botões de Acesso */}
                <div className="max-w-md mx-auto space-y-4">
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setLocation('/mobile-requests')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                    >
                      <Smartphone className="h-5 w-5 mr-2" />
                      Painel Mobile - UBS
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/login'}
                      className="w-full border-green-600 text-green-600 hover:bg-green-50 py-3"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Acesso Administrativo
                    </Button>
                  </div>
                </div>

                {/* Informações do Sistema */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800">Para Unidades Básicas de Saúde</h4>
                      <p className="text-sm text-gray-600">Use o Painel Mobile para criar requisições de exames e consultas de forma rápida e eficiente</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800">Para Administradores</h4>
                      <p className="text-sm text-gray-600">Acesse o sistema completo para gerenciar requisições, usuários e configurações</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rodapé */}
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Sistema desenvolvido para otimizar o atendimento à população alexandrense
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}