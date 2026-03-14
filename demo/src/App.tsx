import { useState } from "react";
import "./App.css";
import CircuitEditor from "./examples/CircuitEditor";
import UMLDiagram from "./examples/UMLDiagram";
import FlowChart from "./examples/FlowChart";
import DatabaseDiagram from "./examples/DatabaseDiagram";

const EXAMPLES = [
  { id: "circuit", label: "Circuit Editor", component: CircuitEditor },
  { id: "uml", label: "UML Class Diagram", component: UMLDiagram },
  { id: "flowchart", label: "Flow Chart", component: FlowChart },
  { id: "database", label: "Database Diagram", component: DatabaseDiagram },
] as const;

function App() {
  const [activeExample, setActiveExample] = useState<string>("uml");

  const ActiveComponent =
    EXAMPLES.find((e) => e.id === activeExample)?.component ?? CircuitEditor;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Example switcher */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1001,
          display: "flex",
          gap: 4,
          background: "rgba(0,0,0,0.5)",
          padding: "4px",
          borderRadius: "6px",
        }}
      >
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setActiveExample(ex.id)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: "system-ui, sans-serif",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              background:
                activeExample === ex.id
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.15)",
              color: activeExample === ex.id ? "#333" : "#ccc",
              fontWeight: activeExample === ex.id ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <ActiveComponent />
    </div>
  );
}

export default App;
