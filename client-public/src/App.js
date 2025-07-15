import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "antd";

import ClientLayout from "./components/Layout/ClientLayout";
import ClientLeaderboard from "./pages/ClientLeaderboard";
import ClientTeamList from "./pages/ClientTeamList";
import ClientTeamDetail from "./pages/ClientTeamDetail";
import ClientGroupList from "./pages/ClientGroupList";
import ClientGroupDetail from "./pages/ClientGroupDetail";
import ClientMatchList from "./pages/ClientMatchList";
import ClientMatchDetail from "./pages/ClientMatchDetail";
import ClientKnockoutBracket from "./pages/ClientKnockoutBracket";
import ClientBestTeamsStats from "./pages/ClientBestTeamsStats";

const { Content } = Layout;

function App() {
  return (
    <div className="App">
      <ClientLayout>
        <Content className="main-content">
          <Routes>
            {/* Default route redirects to leaderboard */}
            <Route path="/" element={<Navigate to="/leaderboard" replace />} />
            
            {/* Client pages */}
            <Route path="/leaderboard" element={<ClientLeaderboard />} />
            <Route path="/teams" element={<ClientTeamList />} />
            <Route path="/teams/:teamId" element={<ClientTeamDetail />} />
            <Route path="/groups" element={<ClientGroupList />} />
            <Route path="/groups/:groupId" element={<ClientGroupDetail />} />
            <Route path="/matches" element={<ClientMatchList />} />
            <Route path="/matches/:matchId" element={<ClientMatchDetail />} />
            <Route path="/bracket" element={<ClientKnockoutBracket />} />
            <Route path="/best-teams" element={<ClientBestTeamsStats />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/leaderboard" replace />} />
          </Routes>
        </Content>
      </ClientLayout>
    </div>
  );
}

export default App;