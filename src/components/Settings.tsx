
import { Users } from 'lucide-react';

interface SettingsPanelProps {
  onNavigate?: (screen: string) => void;
}

const SettingsPanel = ({ onNavigate }: SettingsPanelProps = {}) => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Configurações</h2>

      <div className="bg-white rounded-xl shadow-md">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Familiares</h3>
          <div className="space-y-6">
            <p className="text-gray-600">
              Cadastre até dois familiares para receber notificações sobre seu estado de saúde mental.
              Seus familiares poderão acompanhar seu progresso e oferecer suporte quando necessário.
            </p>
            <button 
              onClick={() => onNavigate && onNavigate('family-register')} 
              className="w-full bg-brand text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-brand/90 transition-colors shadow-sm"
            >
              <Users size={20} />
              <span>Gerenciar Familiares</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;