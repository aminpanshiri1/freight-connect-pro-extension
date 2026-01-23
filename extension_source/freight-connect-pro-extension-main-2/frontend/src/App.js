import React, { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Truck, Calculator, Mail, Settings, MapPin, Shield, RefreshCw, 
  Pin, Phone, ExternalLink, Search, Filter, ChevronDown, LogOut,
  AlertTriangle, CheckCircle, Clock, Star, Trash2, Plus, X
} from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios
axios.defaults.withCredentials = true;

// ==================== AUTH CALLBACK ====================
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionId = hash.split("session_id=")[1]?.split("&")[0];

      if (!sessionId) {
        toast.error("Authentication failed");
        navigate("/");
        return;
      }

      try {
        const response = await axios.post(`${API}/auth/session`, {
          session_id: sessionId,
        });

        const userData = response.data.user;
        toast.success(`Welcome, ${userData.name}!`);
        navigate("/dashboard", { state: { user: userData } });
      } catch (error) {
        console.error("Auth error:", error);
        toast.error("Authentication failed");
        navigate("/");
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="extension-container">
      <div className="login-screen">
        <div className="login-logo">
          <Truck size={40} color="#000" />
        </div>
        <p>Authenticating...</p>
      </div>
    </div>
  );
};

// ==================== LOGIN SCREEN ====================
const LoginScreen = () => {
  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="extension-container">
      <div className="login-screen">
        <div className="login-logo" data-testid="login-logo">
          <Truck size={40} color="#000" />
        </div>
        <h1 className="login-title">Freight Connect Pro</h1>
        <p className="login-subtitle">Your tactical load hunting companion</p>
        <button 
          className="google-btn" 
          onClick={handleGoogleLogin}
          data-testid="google-login-btn"
        >
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

// ==================== DASHBOARD ====================
const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(location.state?.user || null);
  const [isLoading, setIsLoading] = useState(!location.state?.user);
  const [activeTab, setActiveTab] = useState("loads");
  const [loads, setLoads] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState({
    equipment: "",
    originState: "",
    destinationState: "",
    minRpm: ""
  });

  // Calculator state
  const [calcData, setCalcData] = useState({
    rate: 2000,
    miles: 800,
    deadheadMiles: 50,
    fuelCost: 3.50,
    mpg: 6.5,
    tolls: 0
  });
  const [calcResult, setCalcResult] = useState(null);

  // Email templates
  const [templates, setTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", subject: "", body: "" });

  // Broker check
  const [brokerMC, setBrokerMC] = useState("");
  const [brokerInfo, setBrokerInfo] = useState(null);
  const [checkingBroker, setCheckingBroker] = useState(false);

  // Selected load for actions
  const [selectedLoad, setSelectedLoad] = useState(null);

  // Check authentication
  useEffect(() => {
    if (location.state?.user) return;

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        navigate("/");
      }
    };

    checkAuth();
  }, [location.state?.user, navigate]);

  // Fetch loads
  const fetchLoads = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (filters.equipment) params.append("equipment", filters.equipment);
      if (filters.originState) params.append("origin_state", filters.originState);
      if (filters.destinationState) params.append("destination_state", filters.destinationState);
      if (filters.minRpm) params.append("min_rpm", filters.minRpm);

      const response = await axios.get(`${API}/loads?${params.toString()}`);
      setLoads(response.data);
    } catch (error) {
      console.error("Failed to fetch loads:", error);
    }
    setIsRefreshing(false);
  }, [filters]);

  // Seed data on first load
  useEffect(() => {
    const seedAndFetch = async () => {
      try {
        await axios.post(`${API}/seed`);
        fetchLoads();
      } catch (error) {
        console.error("Seed error:", error);
      }
    };
    if (user) seedAndFetch();
  }, [user, fetchLoads]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || activeTab !== "loads") return;
    const interval = setInterval(fetchLoads, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchLoads]);

  // Fetch templates
  useEffect(() => {
    if (user && activeTab === "email") {
      axios.get(`${API}/templates`).then(res => setTemplates(res.data)).catch(console.error);
    }
  }, [user, activeTab]);

  // Pin load
  const togglePin = async (loadId) => {
    try {
      await axios.patch(`${API}/loads/${loadId}/pin`);
      fetchLoads();
    } catch (error) {
      toast.error("Failed to pin load");
    }
  };

  // Mark contacted
  const markContacted = async (loadId) => {
    try {
      await axios.patch(`${API}/loads/${loadId}/contacted`);
      fetchLoads();
      toast.success("Marked as contacted");
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  // Calculate RPM
  const calculateRPM = async () => {
    try {
      const response = await axios.post(`${API}/calculate/rpm`, {
        rate: calcData.rate,
        miles: calcData.miles,
        deadhead_miles: calcData.deadheadMiles,
        fuel_cost_per_gallon: calcData.fuelCost,
        mpg: calcData.mpg,
        tolls: calcData.tolls
      });
      setCalcResult(response.data);
    } catch (error) {
      toast.error("Calculation failed");
    }
  };

  // Check broker
  const checkBroker = async () => {
    if (!brokerMC) return;
    setCheckingBroker(true);
    try {
      const response = await axios.get(`${API}/broker/check/${brokerMC}`);
      setBrokerInfo(response.data);
    } catch (error) {
      toast.error("Failed to check broker");
    }
    setCheckingBroker(false);
  };

  // Create template
  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await axios.post(`${API}/templates`, newTemplate);
      setTemplates(prev => [...prev, { ...newTemplate, template_id: Date.now() }]);
      setNewTemplate({ name: "", subject: "", body: "" });
      setShowTemplateForm(false);
      toast.success("Template created");
    } catch (error) {
      toast.error("Failed to create template");
    }
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    try {
      await axios.delete(`${API}/templates/${templateId}`);
      setTemplates(prev => prev.filter(t => t.template_id !== templateId));
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.error("Logout error:", error);
    }
    navigate("/");
  };

  // Email broker
  const emailBroker = (load, template = null) => {
    let subject = template?.subject || `Load Inquiry: ${load.origin_city}, ${load.origin_state} to ${load.destination_city}, ${load.destination_state}`;
    let body = template?.body || `Hi,\n\nI'm interested in your load from ${load.origin_city}, ${load.origin_state} to ${load.destination_city}, ${load.destination_state}.\n\nPlease let me know if it's still available.\n\nThank you`;
    
    // Replace placeholders
    subject = subject.replace(/{origin}/g, `${load.origin_city}, ${load.origin_state}`)
                     .replace(/{destination}/g, `${load.destination_city}, ${load.destination_state}`)
                     .replace(/{rate}/g, load.rate)
                     .replace(/{miles}/g, load.miles);
    body = body.replace(/{origin}/g, `${load.origin_city}, ${load.origin_state}`)
               .replace(/{destination}/g, `${load.destination_city}, ${load.destination_state}`)
               .replace(/{rate}/g, load.rate)
               .replace(/{miles}/g, load.miles);
    
    window.open(`mailto:${load.broker_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    markContacted(load.load_id);
  };

  if (isLoading) {
    return (
      <div className="extension-container">
        <div className="login-screen">
          <RefreshCw size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
          <p style={{ marginTop: 16 }}>Loading...</p>
        </div>
      </div>
    );
  }

  const getRpmClass = (rpm) => {
    if (rpm >= 2.5) return "high";
    if (rpm >= 2.0) return "medium";
    return "low";
  };

  return (
    <div className="extension-container" data-testid="dashboard">
      {/* Header */}
      <div className="header">
        <div className="logo">
          <div className="logo-icon">
            <Truck size={18} color="#000" />
          </div>
          <div className="logo-text">
            Freight<span>Connect</span>
          </div>
        </div>

        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === "loads" ? "active" : ""}`}
            onClick={() => setActiveTab("loads")}
            data-testid="tab-loads"
          >
            <Truck size={14} /> Loads
          </button>
          <button 
            className={`nav-tab ${activeTab === "calculator" ? "active" : ""}`}
            onClick={() => setActiveTab("calculator")}
            data-testid="tab-calculator"
          >
            <Calculator size={14} /> RPM
          </button>
          <button 
            className={`nav-tab ${activeTab === "email" ? "active" : ""}`}
            onClick={() => setActiveTab("email")}
            data-testid="tab-email"
          >
            <Mail size={14} /> Email
          </button>
          <button 
            className={`nav-tab ${activeTab === "broker" ? "active" : ""}`}
            onClick={() => setActiveTab("broker")}
            data-testid="tab-broker"
          >
            <Shield size={14} /> Broker
          </button>
        </div>

        <div className="user-menu">
          {user?.picture && (
            <div className="user-avatar">
              <img src={user.picture} alt={user.name} />
            </div>
          )}
          <button className="action-btn ghost" onClick={handleLogout} data-testid="logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* LOADS TAB */}
        {activeTab === "loads" && (
          <>
            {/* Filter Bar */}
            <div className="filter-bar">
              <select 
                className="filter-select"
                value={filters.equipment}
                onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
                data-testid="filter-equipment"
              >
                <option value="">All Equipment</option>
                <option value="Van">Van</option>
                <option value="Reefer">Reefer</option>
                <option value="Flatbed">Flatbed</option>
              </select>
              <select 
                className="filter-select"
                value={filters.originState}
                onChange={(e) => setFilters({ ...filters, originState: e.target.value })}
                data-testid="filter-origin"
              >
                <option value="">Origin State</option>
                <option value="IL">Illinois</option>
                <option value="TX">Texas</option>
                <option value="CA">California</option>
                <option value="GA">Georgia</option>
                <option value="CO">Colorado</option>
                <option value="WA">Washington</option>
              </select>
              <select 
                className="filter-select"
                value={filters.minRpm}
                onChange={(e) => setFilters({ ...filters, minRpm: e.target.value })}
                data-testid="filter-rpm"
              >
                <option value="">Min RPM</option>
                <option value="2.0">$2.00+</option>
                <option value="2.5">$2.50+</option>
                <option value="3.0">$3.00+</option>
              </select>
              <button 
                className="action-btn secondary"
                onClick={fetchLoads}
                data-testid="refresh-btn"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Load Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="load-table" data-testid="load-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Route</th>
                    <th>Miles</th>
                    <th>Rate</th>
                    <th>RPM</th>
                    <th>Equip</th>
                    <th>Broker</th>
                    <th>Risk</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.map((load) => (
                    <tr 
                      key={load.load_id} 
                      className={`${load.is_pinned ? "pinned" : ""} ${load.is_contacted ? "contacted" : ""}`}
                      data-testid={`load-row-${load.load_id}`}
                    >
                      <td>
                        <button 
                          className={`pin-btn ${load.is_pinned ? "pinned" : ""}`}
                          onClick={() => togglePin(load.load_id)}
                          data-testid={`pin-btn-${load.load_id}`}
                        >
                          <Pin size={14} fill={load.is_pinned ? "currentColor" : "none"} />
                        </button>
                      </td>
                      <td>
                        <div className="route">
                          <span className="route-city">{load.origin_city}</span>
                          <span className="route-state">{load.origin_state}</span>
                          <span className="route-arrow">↓</span>
                          <span className="route-city">{load.destination_city}</span>
                          <span className="route-state">{load.destination_state}</span>
                        </div>
                      </td>
                      <td className="font-mono">{load.miles}</td>
                      <td className="font-mono">${load.rate.toLocaleString()}</td>
                      <td>
                        <span className={`rpm-badge ${getRpmClass(load.rpm)}`}>
                          ${load.rpm.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className="equipment-badge">{load.equipment_type}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>{load.broker_name}</div>
                        <div className="font-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                          {load.broker_mc}
                        </div>
                      </td>
                      <td>
                        <span className={`risk-badge ${load.scam_risk}`}>
                          {load.scam_risk}
                        </span>
                      </td>
                      <td>
                        <div className="quick-actions">
                          <button 
                            className="action-btn primary"
                            onClick={() => emailBroker(load)}
                            data-testid={`email-btn-${load.load_id}`}
                          >
                            <Mail size={12} />
                          </button>
                          <button 
                            className="action-btn secondary"
                            onClick={() => window.open(`tel:${load.broker_phone}`)}
                            data-testid={`call-btn-${load.load_id}`}
                          >
                            <Phone size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* CALCULATOR TAB */}
        {activeTab === "calculator" && (
          <div className="calculator-card" data-testid="rpm-calculator">
            <h3><Calculator size={18} /> RPM Calculator</h3>
            <div className="calculator-grid">
              <div className="input-group">
                <label>Rate ($)</label>
                <input 
                  type="number" 
                  value={calcData.rate}
                  onChange={(e) => setCalcData({ ...calcData, rate: parseFloat(e.target.value) || 0 })}
                  data-testid="calc-rate"
                />
              </div>
              <div className="input-group">
                <label>Miles</label>
                <input 
                  type="number" 
                  value={calcData.miles}
                  onChange={(e) => setCalcData({ ...calcData, miles: parseInt(e.target.value) || 0 })}
                  data-testid="calc-miles"
                />
              </div>
              <div className="input-group">
                <label>Deadhead Miles</label>
                <input 
                  type="number" 
                  value={calcData.deadheadMiles}
                  onChange={(e) => setCalcData({ ...calcData, deadheadMiles: parseInt(e.target.value) || 0 })}
                  data-testid="calc-deadhead"
                />
              </div>
              <div className="input-group">
                <label>Fuel Cost ($/gal)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={calcData.fuelCost}
                  onChange={(e) => setCalcData({ ...calcData, fuelCost: parseFloat(e.target.value) || 0 })}
                  data-testid="calc-fuel"
                />
              </div>
              <div className="input-group">
                <label>MPG</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={calcData.mpg}
                  onChange={(e) => setCalcData({ ...calcData, mpg: parseFloat(e.target.value) || 0 })}
                  data-testid="calc-mpg"
                />
              </div>
              <div className="input-group">
                <label>Tolls ($)</label>
                <input 
                  type="number" 
                  value={calcData.tolls}
                  onChange={(e) => setCalcData({ ...calcData, tolls: parseFloat(e.target.value) || 0 })}
                  data-testid="calc-tolls"
                />
              </div>
            </div>
            <button 
              className="action-btn primary" 
              style={{ marginTop: 16, width: "100%" }}
              onClick={calculateRPM}
              data-testid="calc-submit"
            >
              Calculate
            </button>

            {calcResult && (
              <div className="result-display" data-testid="calc-result">
                <div className="result-row">
                  <span className="result-label">Gross RPM</span>
                  <span className="result-value highlight">${calcResult.gross_rpm}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Net RPM (after fuel)</span>
                  <span className="result-value">${calcResult.net_rpm}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">RPM+ (with deadhead)</span>
                  <span className="result-value">${calcResult.rpm_plus}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Fuel Cost</span>
                  <span className="result-value">${calcResult.fuel_cost}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Net Profit</span>
                  <span className="result-value" style={{ color: "var(--success)" }}>${calcResult.net_profit}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Total Miles</span>
                  <span className="result-value">{calcResult.total_miles}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EMAIL TAB */}
        {activeTab === "email" && (
          <div data-testid="email-templates">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Email Templates</h3>
              <button 
                className="action-btn primary"
                onClick={() => setShowTemplateForm(!showTemplateForm)}
                data-testid="add-template-btn"
              >
                {showTemplateForm ? <X size={14} /> : <Plus size={14} />}
                {showTemplateForm ? "Cancel" : "New Template"}
              </button>
            </div>

            {showTemplateForm && (
              <div className="calculator-card" style={{ marginBottom: 16 }}>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label>Template Name</label>
                  <input 
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Quick Inquiry"
                    data-testid="template-name"
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label>Subject</label>
                  <input 
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="Use {origin}, {destination}, {rate}, {miles}"
                    data-testid="template-subject"
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label>Body</label>
                  <textarea 
                    value={newTemplate.body}
                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                    placeholder="Use {origin}, {destination}, {rate}, {miles}"
                    style={{
                      background: "var(--secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "8px 12px",
                      color: "var(--foreground)",
                      fontFamily: "inherit",
                      fontSize: 13,
                      minHeight: 100,
                      width: "100%",
                      resize: "vertical"
                    }}
                    data-testid="template-body"
                  />
                </div>
                <button 
                  className="action-btn primary" 
                  style={{ width: "100%" }}
                  onClick={createTemplate}
                  data-testid="save-template-btn"
                >
                  Save Template
                </button>
              </div>
            )}

            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 12 }}>
              Use placeholders: {"{origin}"}, {"{destination}"}, {"{rate}"}, {"{miles}"}
            </p>

            {templates.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Mail size={28} />
                </div>
                <div className="empty-state-title">No Templates Yet</div>
                <div className="empty-state-text">Create your first email template to speed up your workflow</div>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.template_id} className="template-card" data-testid={`template-${template.template_id}`}>
                  <div className="template-header">
                    <div>
                      <div className="template-name">{template.name}</div>
                      <div className="template-subject">{template.subject}</div>
                    </div>
                    <button 
                      className="action-btn ghost"
                      onClick={() => deleteTemplate(template.template_id)}
                      data-testid={`delete-template-${template.template_id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* BROKER TAB */}
        {activeTab === "broker" && (
          <div data-testid="broker-check">
            <div className="calculator-card" style={{ marginBottom: 16 }}>
              <h3><Shield size={18} /> Broker Safety Check</h3>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
                Check FMCSA records, scam reports, and factoring ratings
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input 
                  type="text"
                  placeholder="Enter MC Number (e.g., MC123456)"
                  value={brokerMC}
                  onChange={(e) => setBrokerMC(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "8px 12px",
                    color: "var(--foreground)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14
                  }}
                  data-testid="broker-mc-input"
                />
                <button 
                  className="action-btn primary"
                  onClick={checkBroker}
                  disabled={checkingBroker}
                  data-testid="check-broker-btn"
                >
                  {checkingBroker ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  Check
                </button>
              </div>
            </div>

            {brokerInfo && (
              <div className="broker-panel" data-testid="broker-info">
                <div className="broker-header">
                  <div>
                    <div className="broker-name">{brokerInfo.company_name}</div>
                    <div className="broker-mc">{brokerInfo.mc_number}</div>
                  </div>
                  <span className={`risk-badge ${brokerInfo.risk_level}`}>
                    {brokerInfo.risk_level === "high" && <AlertTriangle size={12} />}
                    {brokerInfo.risk_level === "low" && <CheckCircle size={12} />}
                    {brokerInfo.risk_level} risk
                  </span>
                </div>

                <div className="broker-stats">
                  <div className="broker-stat">
                    <div className="broker-stat-label">Status</div>
                    <div className="broker-stat-value" style={{ color: brokerInfo.is_active ? "var(--success)" : "var(--destructive)" }}>
                      {brokerInfo.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div className="broker-stat">
                    <div className="broker-stat-label">Safety Rating</div>
                    <div className="broker-stat-value">{brokerInfo.safety_rating}</div>
                  </div>
                  <div className="broker-stat">
                    <div className="broker-stat-label">Scam Reports</div>
                    <div className="broker-stat-value" style={{ color: brokerInfo.scam_reports > 0 ? "var(--destructive)" : "var(--success)" }}>
                      {brokerInfo.scam_reports}
                    </div>
                  </div>
                  <div className="broker-stat">
                    <div className="broker-stat-label">Factoring</div>
                    <div className="broker-stat-value">{brokerInfo.factoring_rating}</div>
                  </div>
                  <div className="broker-stat">
                    <div className="broker-stat-label">Days in Business</div>
                    <div className="broker-stat-value">{brokerInfo.days_in_business}</div>
                  </div>
                </div>
              </div>
            )}

            {!brokerInfo && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Shield size={28} />
                </div>
                <div className="empty-state-title">Enter MC Number</div>
                <div className="empty-state-text">Check broker safety and scam risk before booking</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className={`status-dot ${isRefreshing ? "refreshing" : ""}`}></span>
          <span>{isRefreshing ? "Refreshing..." : "Connected"}</span>
        </div>
        <div className="status-item">
          <Clock size={12} />
          <span>Auto-refresh: {autoRefresh ? "30s" : "Off"}</span>
        </div>
        <div className="status-item">
          <span>{loads.length} loads</span>
        </div>
      </div>
    </div>
  );
};

// ==================== APP ROUTER ====================
function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

// ==================== MAIN APP ====================
function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-center" 
        richColors 
        theme="dark"
        toastOptions={{
          style: {
            background: "#121214",
            border: "1px solid #27272A",
            color: "#FAFAFA"
          }
        }}
      />
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
