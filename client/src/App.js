import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "antd";

import MainLayout from "./components/Layout/MainLayout";
import TournamentLayout from "./components/Layout/TournamentLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Auth/LoginPage";
import ChangePasswordPage from "./pages/Auth/ChangePasswordPage";
import { useAuthStore } from "./stores/authStore";
// Tournament components
import TournamentGroupCreate from "./pages/Tournaments/TournamentGroupCreate";
import TournamentGroupDetail from "./pages/Tournaments/TournamentGroupDetail";
import TournamentGroupEdit from "./pages/Tournaments/TournamentGroupEdit";
import TournamentTeamList from "./pages/Tournaments/TournamentTeamList";
import TournamentTeamCreate from "./pages/Tournaments/TournamentTeamCreate";
import TournamentTeamDetail from "./pages/Tournaments/TournamentTeamDetail";
import TournamentTeamEdit from "./pages/Tournaments/TournamentTeamEdit";
import TournamentMatchList from "./pages/Tournaments/TournamentMatchList";
import TournamentMatchCreate from "./pages/Tournaments/TournamentMatchCreate";
import TournamentMatchGenerator from "./pages/Tournaments/TournamentMatchGenerator";
import TournamentList from "./pages/Tournaments/TournamentList";
import TournamentDetail from "./pages/Tournaments/TournamentDetail";
import TournamentCreate from "./pages/Tournaments/TournamentCreate";
import TournamentEdit from "./pages/Tournaments/TournamentEdit";
import TournamentGroupList from "./pages/Tournaments/TournamentGroupList";
import KnockoutBracket from "./pages/Tournaments/KnockoutBracket";

// Groups components (only used ones)
import GroupLeaderboard from "./pages/Groups/GroupLeaderboard";

// Stats components
import StatsOverview from "./pages/Stats/StatsOverview";
import AllGroupStandings from "./pages/Stats/AllGroupStandings";
import OverallLeaderboard from "./pages/Stats/OverallLeaderboard";
import BestTeamsStats from "./pages/Stats/BestTeamsStats";

// Other components
import NotFound from "./pages/NotFound";

import "./App.css";
import TournamentMatchDetail from "./pages/Tournaments/TournamentMatchDetail.js";
import TournamentMatchEdit from "./pages/Tournaments/TournamentMatchEdit";
import TournamentMatchResultEdit from "./pages/Tournaments/TournamentMatchResultEdit";
import TournamentOverallLeaderboard from "./pages/Tournaments/TournamentOverallLeaderboard";
import TournamentLiveMatch from "./pages/Tournaments/TournamentLiveMatch";
import TournamentBestTeamsStats from "./pages/Tournaments/TournamentBestTeamsStats";

const { Content } = Layout;

function App() {
  const { initialize, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="App">
      <Routes>
        {/* 登入頁面 - 如果已登入則重定向到首頁 */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        
        {/* 修改密碼頁面 - 需要登入保護 */}
        <Route 
          path="/change-password" 
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          } 
        />
        
        {/* 所有管理功能都需要登入保護 */}
        {/* 主要管理路由 - 需要登入保護 */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Content className="main-content">
                  <Routes>
                    {/* 儀表板 */}
                    <Route path="/" element={<TournamentList />} />

                    {/* 統計頁面 */}
                    <Route path="/stats" element={<StatsOverview />} />
                    <Route path="/stats/overview" element={<StatsOverview />} />
                    <Route path="/stats/group-standings" element={<AllGroupStandings />} />
                    <Route path="/stats/overall-leaderboard" element={<OverallLeaderboard />} />
                    <Route path="/stats/best-teams" element={<BestTeamsStats />} />

                    {/* 404 頁面 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Content>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Tournament Create Route (must come before dynamic :id route) - 需要登入保護 */}
        <Route
          path="/tournaments/create"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Content className="main-content">
                  <TournamentCreate />
                </Content>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Tournament-specific routes with TournamentLayout - 需要登入保護 */}
        <Route
          path="/tournaments/:id/*"
          element={
            <ProtectedRoute>
              <TournamentLayout>
              <Routes>
                {/* Tournament Overview */}
                <Route path="/" element={<TournamentDetail />} />

                {/* Team Management */}
                <Route path="/teams" element={<TournamentTeamList />} />
                <Route path="/teams/create" element={<TournamentTeamCreate />} />
                <Route path="/teams/:teamId" element={<TournamentTeamDetail />} />
                <Route path="/teams/:teamId/edit" element={<TournamentTeamEdit />} />

                {/* Group Management */}
                <Route path="/groups" element={<TournamentGroupList />} />
                <Route path="/groups/create" element={<TournamentGroupCreate />} />
                <Route path="/groups/:groupId" element={<TournamentGroupDetail />} />
                <Route path="/groups/:groupId/edit" element={<TournamentGroupEdit />} />

                {/* Match Management */}
                <Route path="/matches" element={<TournamentMatchList />} />
                <Route path="/matches/create" element={<TournamentMatchCreate />} />
                <Route path="/matches/generate" element={<TournamentMatchGenerator />} />
                <Route path="/matches/:matchId" element={<TournamentMatchDetail />} />
                <Route path="/matches/:matchId/live" element={<TournamentLiveMatch />} />
                <Route path="/matches/:matchId/edit" element={<TournamentMatchEdit />} />
                <Route path="/matches/:matchId/result-edit" element={<TournamentMatchResultEdit />} />

                {/* Athlete Management */}
                <Route path="/athletes" element={<div>Tournament Athletes List</div>} />
                <Route path="/athletes/create" element={<div>Create Tournament Athlete</div>} />
                <Route path="/athletes/:athleteId" element={<div>Tournament Athlete Detail</div>} />
                <Route path="/athletes/:athleteId/edit" element={<div>Edit Tournament Athlete</div>} />

                {/* Leaderboard */}
                <Route path="/leaderboard/groups" element={<GroupLeaderboard />} />
                <Route path="/leaderboard/overall" element={<TournamentOverallLeaderboard />} />
                <Route path="/leaderboard/stats" element={<div>Tournament Statistics</div>} />
                <Route path="/leaderboard/best-teams" element={<TournamentBestTeamsStats />} />

                {/* Settings */}
                <Route path="/settings" element={<div>Tournament Settings</div>} />
                <Route path="/edit" element={<TournamentEdit />} />
                <Route path="/bracket" element={<KnockoutBracket />} />
              </Routes>
            </TournamentLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
