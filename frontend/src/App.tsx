// This is the starting screen — replace it as real FitPrep features get built.
// The backend health check confirms the frontend and backend can talk to each other.
import { useEffect, useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "ok" | "unreachable">(
    "checking"
  );

  useEffect(() => {
    fetch("http://localhost:4000/api/health")
      .then((res) => (res.ok ? setBackendStatus("ok") : setBackendStatus("unreachable")))
      .catch(() => setBackendStatus("unreachable"));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white text-neutral-900">
      <h1 className="text-3xl font-bold">FitPrep</h1>
      <p className="text-neutral-600">Batch-cook once, eat well all week.</p>
      <p className="text-sm text-neutral-400">
        Backend status: {backendStatus === "checking" ? "checking…" : backendStatus}
      </p>
    </div>
  );
}

export default App;
