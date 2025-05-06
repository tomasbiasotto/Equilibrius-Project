import MoodTracker from './MoodTracker';

interface DashboardProps {
  onNewEntry?: () => void;
}

const Dashboard = ({ onNewEntry }: DashboardProps = {}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4 bg-white">
  <div className="w-full max-w-2xl space-y-8">
    <div className="text-center mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Olá! Como está seu humor hoje?</h1>
      <p className="text-gray-500">Registre seu humor para acompanhar seu bem-estar.</p>
    </div>
    <MoodTracker onNewEntry={onNewEntry} />

  </div>
</div>
  );
};

export default Dashboard;