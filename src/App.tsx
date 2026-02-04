import "./App.css";

function App() {
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

export default App;
