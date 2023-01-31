import "./styles.css";
import { React } from "./react";
import { createResource } from "./dogApi";
const resource = createResource();
function App() {
  const [state, setState] = React.useState(1);
  const dogs = resource.read(state);
  return (
    <div>
      <h1>Hello ByteConf!</h1>
      <button onClick={() => setState(state + 1)}>{state}</button>
      {dogs.map(dog => (
        <img src={dog} alt="woof" />
      ))}
    </div>
  );
}
const container = document.getElementById("root");
React.createRoot(container).render(<App />);
