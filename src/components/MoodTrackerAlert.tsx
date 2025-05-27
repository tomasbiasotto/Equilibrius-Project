import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MoodTrackerAlertProps {
  onOpenMoodTracker: () => void;
}

const MoodTrackerAlert: React.FC<MoodTrackerAlertProps> = ({ onOpenMoodTracker }) => {
  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 mb-4 animate-slideUp">
      <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-4 max-w-sm w-full">
        <div className="flex">
          <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
            <AlertCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Como está seu humor hoje?
            </h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>
                Você ainda não registrou seu humor hoje. Manter um registro diário ajuda você a acompanhar seu bem-estar emocional.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={onOpenMoodTracker}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Registrar meu humor
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={(e) => {
                e.stopPropagation();
                const alert = e.currentTarget.closest('.animate-slideUp');
                if (alert) {
                  alert.classList.add('animate-slideDown');
                  setTimeout(() => {
                    alert.classList.add('hidden');
                  }, 300);
                }
              }}
            >
              <span className="sr-only">Fechar</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodTrackerAlert;
