import "./App.css";
import { useGameDataLoading, gameDataStore } from "./state/gameDataStore";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-4" />
        <p className="text-xl text-gray-300">Loading game data...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error }: { error: string }) {
  const handleRetry = () => {
    gameDataStore.getState().loadGameData();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center max-w-lg p-6">
        <div className="text-red-500 text-6xl mb-4">!</div>
        <h1 className="text-2xl font-bold mb-4">Failed to Load Game Data</h1>
        <pre className="bg-gray-800 p-4 rounded-lg text-left text-sm text-red-400 mb-6 overflow-auto max-h-64 whitespace-pre-wrap">
          {error}
        </pre>
        <button
          onClick={handleRetry}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function MainContent() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold">Star Rupture Factory Layout Planner</h1>
      </header>

      <main className="flex h-[calc(100vh-65px)]">
        {/* Left Panel - Building Palette */}
        <aside className="w-64 border-r border-gray-700 p-4">
          <h2 className="text-lg font-semibold mb-4">Buildings</h2>
          <p className="text-gray-400 text-sm">Building palette will go here</p>
        </aside>

        {/* Main Canvas Area */}
        <div className="flex-1 p-4">
          <div className="h-full border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Layout Canvas</p>
          </div>
        </div>

        {/* Right Panel - Production & Stats */}
        <aside className="w-72 border-l border-gray-700 p-4">
          <h2 className="text-lg font-semibold mb-4">Production Targets</h2>
          <p className="text-gray-400 text-sm mb-6">Add production targets here</p>

          <h2 className="text-lg font-semibold mb-4">Statistics</h2>
          <p className="text-gray-400 text-sm">Layout statistics will appear here</p>
        </aside>
      </main>
    </div>
  );
}

function App() {
  const { data, isLoading, error } = useGameDataLoading();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (!data) {
    // Should not happen if loadGameData() is called at startup,
    // but handle gracefully in case it does
    return <LoadingScreen />;
  }

  return <MainContent />;
}

export default App;
