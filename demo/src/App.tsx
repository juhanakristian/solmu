import { useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import SolmuGraph from "./SolmuGraph";

function App() {
  const [count, setCount] = useState(0);

  return <SolmuGraph />;
}

export default App;
