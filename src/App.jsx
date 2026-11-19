import { useState } from "react";
import { Wallet } from "lucide-react";
import { AppShell } from "./components/layout/AppShell";
import { ThemeProvider } from "./components/layout/ThemeProvider";
import { ToastProvider } from "./components/ui/ToastProvider";
import { useAuth } from "./contexts/AuthContext";
import { AiPage } from "./features/ai/AiPage";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { AuthProvider } from "./features/auth/AuthProvider";
import { AuthScreen } from "./features/auth/AuthScreen";
import { HeroLanding } from "./features/auth/HeroLanding";
import { CardsPage } from "./features/cards/CardsPage";
import { OverviewPage } from "./features/dashboard/OverviewPage";
import { FinancialProvider } from "./features/finance/FinancialProvider";
import { RecurringPage } from "./features/recurring/RecurringPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { QuickEntrySheet } from "./features/transactions/QuickEntrySheet";
import { TransactionsPage } from "./features/transactions/TransactionsPage";

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--bg-canvas)]">
      <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25">
        <Wallet size={22} />
      </div>
      <p className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">
        Finans
      </p>
    </div>
  );
}

function AuthenticatedWorkspace() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryType, setQuickEntryType] = useState("expense");

  const openQuickEntry = (type = "expense") => {
    setQuickEntryType(type);
    setQuickEntryOpen(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewPage
            onOpenQuickEntry={openQuickEntry}
            onNavigateTab={setActiveTab}
          />
        );
      case "transactions":
        return <TransactionsPage onOpenQuickEntry={openQuickEntry} />;
      case "cards":
        return <CardsPage />;
      case "recurring":
        return <RecurringPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "ai":
        return <AiPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <FinancialProvider
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    >
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChangeMonth={setSelectedMonth}
        onChangeYear={setSelectedYear}
        onOpenQuickEntry={() => openQuickEntry("expense")}
        quickEntrySheet={
          <QuickEntrySheet
            isOpen={quickEntryOpen}
            onClose={() => setQuickEntryOpen(false)}
            initialType={quickEntryType}
          />
        }
      >
        {renderContent()}
      </AppShell>
    </FinancialProvider>
  );
}

function FinansApp() {
  const { session, isLoading, isRecovering, finishRecovery } = useAuth();
  const [guestView, setGuestView] = useState("hero"); // 'hero' | 'login' | 'signup'

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isRecovering) {
    return (
      <AuthScreen
        isRecovering={true}
        onFinishedRecovery={() => {
          finishRecovery();
          setGuestView("login");
        }}
      />
    );
  }

  if (!session) {
    if (guestView === "hero") {
      return (
        <HeroLanding
          onEnterLogin={() => setGuestView("login")}
          onEnterSignup={() => setGuestView("signup")}
        />
      );
    }

    return (
      <AuthScreen
        key={guestView}
        initialMode={guestView}
        onBackHero={() => setGuestView("hero")}
      />
    );
  }

  return <AuthenticatedWorkspace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <FinansApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
