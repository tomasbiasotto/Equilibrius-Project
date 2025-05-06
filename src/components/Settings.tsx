
import { Bell, Lock, User, Users } from 'lucide-react';

interface SettingsPanelProps {
  onNavigate?: (screen: string) => void;
}

const SettingsPanel = ({ onNavigate }: SettingsPanelProps = {}) => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Configurações</h2>

      <div className="bg-white rounded-xl shadow-md divide-y">
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
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Perfil</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="text-gray-500" />
                <span>Informações da Conta</span>
              </div>
              <button className="text-brand hover:text-brand/80">Editar</button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock className="text-gray-500" />
                <span>Configurações de Privacidade</span>
              </div>
              <button className="text-brand hover:text-brand/80">Gerenciar</button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Notificações</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="text-gray-500" />
                <span>Lembretes Diários</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default SettingsPanel;