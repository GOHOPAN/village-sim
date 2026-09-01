import ChatBox from "./components/ChatBox";
import EavesdropModal from "./components/EavesdropModal";
import FacilityModal from "./components/FacilityModal";
import GameCanvas from "./components/GameCanvas";
import HUD from "./components/HUD";
import Inventory from "./components/Inventory";
import LoadingOverlay from "./components/LoadingOverlay";

export default function App() {
  return (
    <div className="app-root">
      <HUD />
      <GameCanvas />
      <ChatBox />
      <EavesdropModal />
      <FacilityModal />
      <Inventory />
      <LoadingOverlay />
    </div>
  );
}
